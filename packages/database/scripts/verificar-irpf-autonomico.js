/* eslint-disable no-console */
// Verificador IRPF autonómico 2025 contra Manual práctico Renta 2025 (AEAT)
// 1) limpia filas-resumen parásitas  2) descarga escalas oficiales con curl
// 3) compara fila a fila y marca OFFICIAL_VERIFIED con fuente
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

for (const line of fs.readFileSync(path.join(__dirname, '..', '..', '..', '.env.local'), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE = 'https://sede.agenciatributaria.gob.es';
const PREFIJO = '/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const PAGINAS = [
  ['comunidad-autonoma-andalucia', 'Andalucía'],
  ['comunidad-autonoma-aragon', 'Aragón'],
  ['comunidad-autonoma-principado-asturias', 'Asturias (Principado de)'],
  ['comunidad-autonoma-illes-balears', 'Illes Balears'],
  ['comunidad-autonoma-canarias', 'Canarias'],
  ['comunidad-autonoma-cantabria', 'Cantabria'],
  ['comunidad-autonoma-castilla-mancha', 'Castilla-La Mancha'],
  ['comunidad-castilla-leon', 'Castilla y León'],
  ['comunidad-autonoma-cataluna', 'Cataluña'],
  ['comunidad-autonoma-extremadura', 'Extremadura'],
  ['comunidad-autonoma-galicia', 'Galicia'],
  ['comunidad-madrid', 'Madrid (Comunidad de)'],
  ['comunidad-autonoma-region-murcia', 'Región de Murcia'],
  ['comunidad-autonoma-rioja', 'La Rioja'],
  ['comunitat-valenciana', 'Comunitat Valenciana'],
];

function descargar(url) {
  return execFileSync('curl.exe', ['-sS', '-L', '-A', UA, url], { maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
}

function numEs(s) {
  if (!s) return null;
  const limpio = s.replace(/[^\d,\-.]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? n : null;
}

function extraerEscalas(html) {
  const bloques = [];
  const tablas = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  for (const t of tablas) {
    const escala = [];
    let acumulado = 0;
    for (const f of t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const celdas = [...f[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c =>
        c[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
      );
      if (celdas.length >= 4) {
        const tipo = numEs(celdas[3]);
        const restoTxt = celdas[2];
        if (tipo !== null && tipo > 0 && tipo <= 60) {
          const esAbierta = /adelante/i.test(restoTxt);
          if (esAbierta) {
            escala.push({ hastaEur: null, tipoPct: tipo });
          } else {
            const resto = numEs(restoTxt);
            if (resto === null) continue;
            acumulado += resto;
            escala.push({ hastaEur: Math.round(acumulado * 100) / 100, tipoPct: tipo });
          }
        }
      }
    }
    if (escala.length >= 3) bloques.push(escala);
  }
  return bloques;
}

function comparar(dbTramos, oficial) {
  if (dbTramos.length !== oficial.length) return false;
  const db = [...dbTramos].sort((a, b) => Number(a.desdeEur) - Number(b.desdeEur));
  for (let i = 0; i < db.length; i++) {
    const d = db[i], o = oficial[i];
    const hastaOk =
      d.hastaEur === null ? o.hastaEur === null : o.hastaEur !== null && Math.abs(Number(d.hastaEur) - o.hastaEur) < 0.02;
    if (!hastaOk) return false;
    if (Math.abs(Number(d.tipoAutonomicoPct) - o.tipoPct) > 0.001) return false;
  }
  return true;
}

(async () => {
  // Paso 1: limpiar filas-resumen parásitas (desde=0, hasta=null, habiendo otras filas)
  const todas = await prisma.irpfTramoAutonomico.findMany();
  const grupos = {};
  for (const f of todas) (grupos[`${f.comunidad}|${f.taxYear}`] ||= []).push(f);
  let borradas = 0;
  for (const [, grupo] of Object.entries(grupos)) {
    if (grupo.length < 2) continue;
    const parasitas = grupo.filter(g => Number(g.desdeEur) === 0 && g.hastaEur === null);
    for (const p of parasitas) {
      await prisma.irpfTramoAutonomico.delete({ where: { id: p.id } });
      borradas++;
      console.log(`LIMPIEZA ${p.comunidad} ${p.taxYear}: fila-resumen eliminada (${p.id})`);
    }
  }
  console.log(`Filas-resumen eliminadas: ${borradas}\n`);

  // Paso 2: verificar contra AEAT
  const filas = await prisma.irpfTramoAutonomico.findMany({ where: { taxYear: 2025 } });
  const porComunidad = {};
  for (const f of filas) (porComunidad[f.comunidad] ||= []).push(f);

  let okTotal = 0;
  const fallos = [];
  for (const [slug, comunidadDb] of PAGINAS) {
    const url = `${BASE}${PREFIJO}${slug}.html`;
    let html;
    try {
      html = descargar(url);
    } catch (e) {
      fallos.push(`${comunidadDb}: descarga falló`);
      continue;
    }
    const bloques = extraerEscalas(html);
    const dbTramos = porComunidad[comunidadDb];
    if (!dbTramos) { fallos.push(`${comunidadDb}: sin filas en BBDD`); continue; }

    const coincide = bloques.some(b => comparar(dbTramos, b));
    if (coincide) {
      const r = await prisma.irpfTramoAutonomico.updateMany({
        where: { comunidad: comunidadDb, taxYear: 2025 },
        data: {
          status: 'OFFICIAL_VERIFIED',
          confianza: 'ALTA',
          fuenteTexto: `AEAT · Manual práctico Renta 2025 · ${url}`,
        },
      });
      console.log(`OK  ${comunidadDb.padEnd(26)} ${dbTramos.length} tramos -> verificadas ${r.count} filas`);
      okTotal += r.count;
    } else {
      fallos.push(`${comunidadDb}: no coincide con ningún bloque oficial (bloques detectados: ${bloques.map(b => b.length).join(',') || 'ninguno'})`);
      console.log(`DIF ${comunidadDb} (BBDD ${dbTramos.length} filas):`);
      const dbOrd = [...dbTramos].sort((a, b) => Number(a.desdeEur) - Number(b.desdeEur));
      const mejor = bloques.find(b => b.length === dbOrd.length) ?? bloques[0] ?? [];
      for (let i = 0; i < Math.max(mejor.length, dbOrd.length); i++) {
        const o = mejor[i], d = dbOrd[i];
        const oTxt = o ? `${o.hastaEur} @${o.tipoPct}%` : '—';
        const dTxt = d ? `${d.hastaEur} @${d.tipoAutonomicoPct}%` : '—';
        const marca = o && d && Math.abs(Number(d.hastaEur ?? -1) - Number(o.hastaEur ?? -2)) < 0.02 && Math.abs(Number(d.tipoAutonomicoPct) - o.tipoPct) < 0.001 ? ' ' : 'X';
        console.log(`  ${marca} oficial=${oTxt.padEnd(20)} bbdd=${dTxt}`);
      }
    }
  }
  console.log(`\nTotal verificadas: ${okTotal} filas`);
  for (const f of fallos) console.log(`FALLO ${f}`);
  await prisma.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
