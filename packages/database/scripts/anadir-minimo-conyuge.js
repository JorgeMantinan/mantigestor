/* eslint-disable no-console */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
for (const line of fs.readFileSync(path.join(__dirname, '..', '..', '..', '.env.local'), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const existentes = await prisma.minimoPersonalFamiliar.findMany({
    where: { taxYear: 2025 },
    select: { territorio: true },
    distinct: ['territorio'],
  });
  let creados = 0;
  for (const { territorio } of existentes) {
    const yaExiste = await prisma.minimoPersonalFamiliar.findFirst({
      where: { taxYear: 2025, territorio, concepto: { contains: 'ónyuge' } },
    });
    if (yaExiste) continue;
    await prisma.minimoPersonalFamiliar.create({
      data: {
        id: crypto.randomUUID(),
        territorio,
        concepto: 'Mínimo por cónyuge a cargo (rentas <8.000 €)',
        importeEur: 3400,
        taxYear: 2025,
        notas: 'Art. 56.1.b LIRPF: 3.400 € (referencia estatal; algunas CCAA lo elevan ~10%).',
        fuenteTexto: 'AEAT · Manual Renta 2025 · cap. 14 · https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-minimos-personales-y-familiares/cap14-cuadro-minimos.html',
        status: 'OFFICIAL_VERIFIED',
      },
    });
    creados++;
  }
  console.log(`mínimos cónyuge creados para ${creados} territorios`);
  await prisma.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
