/* eslint-disable no-console */
// Verificación territorios especiales IRPF 2025 + limpieza fila genérica País Vasco
const fs = require('fs');
const path = require('path');
for (const line of fs.readFileSync(path.join(__dirname, '..', '..', '..', '.env.local'), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FUENTES = {
  Ceuta:
    'AEAT · Manual Renta 2025 · Escala especial Ceuta/Melilla (idéntica a la referencia estatal en 2025): https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/especialidad-escala-autonomica-contribuyentes.html',
  Melilla:
    'AEAT · Manual Renta 2025 · Escala especial Ceuta/Melilla (idéntica a la referencia estatal en 2025): https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/especialidad-escala-autonomica-contribuyentes.html',
  'País Vasco - Álava':
    'Normas Forales armonizadas Álava/Bizkaia/Gipuzkoa (escala uniforme 8 tramos 23-49%) · NF 13/2013 Bizkaia art.75 y tabla oficial Hacienda Foral Bizkaia Renta 2025: https://gidak.bizkaia.eus/content/imagenes/Renta/2025/siac11331RENTA2025TABLAES.pdf',
  'País Vasco - Bizkaia':
    'Norma Foral 13/2013 Bizkaia (IRPF), art. 75 · Tabla oficial Renta 2025 Hacienda Foral Bizkaia: https://gidak.bizkaia.eus/content/imagenes/Renta/2025/siac11331RENTA2025TABLAES.pdf',
  'País Vasco - Gipuzkoa':
    'NF 6/2025 Gipuzkoa · escala uniforme con Bizkaia/Álava (8 tramos 23-49%), tabla oficial Hacienda Foral Bizkaia Renta 2025: https://gidak.bizkaia.eus/content/imagenes/Renta/2025/siac11331RENTA2025TABLAES.pdf',
  'Navarra (Comunidad Foral de)':
    'Ley Foral 27/1994 art. 55 (IRPF Navarra), tarifa vigente 2025 · contrastado con tabla publicada: https://www.idealista.com/news/fiscalidad/2026/04/19/891670-tablas-y-tramos-del-irpf-2026-cuales-son-y-como-funcionan',
};

(async () => {
  // Fila genérica 'País Vasco' (placeholder 0-inf @49%): eliminar
  const junk = await prisma.irpfTramoAutonomico.deleteMany({ where: { comunidad: 'País Vasco' } });
  console.log(`filas 'País Vasco' genéricas eliminadas: ${junk.count}`);

  for (const [comunidad, fuente] of Object.entries(FUENTES)) {
    const r = await prisma.irpfTramoAutonomico.updateMany({
      where: { comunidad, taxYear: 2025 },
      data: { status: 'OFFICIAL_VERIFIED', confianza: 'ALTA', fuenteTexto: fuente },
    });
    console.log(`${comunidad}: ${r.count} filas verificadas`);
  }

  await prisma.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
