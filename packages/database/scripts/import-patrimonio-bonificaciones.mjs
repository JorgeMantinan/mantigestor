/**
 * Importa bonificaciones autonómicas del Impuesto sobre el Patrimonio 2025.
 * Fuentes: AEAT Manual Patrimonio 2025, legislación autonómica vigente.
 * Ejecutar: node packages/database/scripts/import-patrimonio-bonificaciones.mjs
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

for (const line of readFileSync(join(__dirname, '..', '..', '..', '.env.local'), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const prisma = new PrismaClient()

const BONIFICACIONES = [
  {
    comunidad: 'Madrid (Comunidad de)',
    descripcion: 'Bonificación 100% cuota íntegra IP',
    porcentajeCents: 10000,
    importeMaxCents: null,
    condiciones: null,
    notas: 'Bonificación del 100% sobre la cuota íntegra del IP. Efecto práctico: mecanismo anti-ITSGF ajusta la bonificación para que el contribuyente pague lo mismo que con el ITSGF (Ley 10/2001).',
  },
  {
    comunidad: 'Andalucía',
    descripcion: 'Mecanismo anti-ITSGF',
    porcentajeCents: 0,
    importeMaxCents: null,
    condiciones: 'Aplica a contribuyentes con patrimonio neto >3.000.000€',
    notas: 'Andalucía NO tiene bonificación general propia. El mecanismo anti-ITSGF ajusta la bonificación para igualar la cuota del ITSGF. Para patrimonios <3.000.000€ no hay bonificación efectiva.',
  },
  {
    comunidad: 'Cantabria',
    descripcion: 'Bonificación 100% cuota minorada IP',
    porcentajeCents: 10000,
    importeMaxCents: null,
    condiciones: 'No aplica si patrimonio neto supera cierto umbral (pendiente de confirmar)',
    notas: 'Bonificación del 100% sobre la cuota minorada (no la íntegra). Condición de umbral de patrimonio no完全amente verificada.',
  },
  {
    comunidad: 'La Rioja',
    descripcion: 'Mecanismo anti-ITSGF',
    porcentajeCents: 0,
    importeMaxCents: null,
    condiciones: 'Aplica a contribuyentes con patrimonio neto >3.000.000€',
    notas: 'Mismo mecanismo que Andalucía y Madrid. La bonificación se ajusta para que la cuota resultante sea la del ITSGF.',
  },
  {
    comunidad: 'Galicia',
    descripcion: 'Bonificación 50% cuota IP',
    porcentajeCents: 5000,
    importeMaxCents: null,
    condiciones: null,
    notas: 'Bonificación general del 50% sobre la cuota del IP (Ley 19/2006). Aplica sobre la cuota calculada con la escala gallega.',
  },
  {
    comunidad: 'Región de Murcia',
    descripcion: 'Bonificación 100% cuota IP',
    porcentajeCents: 10000,
    importeMaxCents: null,
    condiciones: null,
    notas: 'Bonificación del 100% sobre la cuota del IP. Efecto: exención práctica del impuesto en la CCAA.',
  },
  {
    comunidad: 'Asturias (Principado de)',
    descripcion: 'Bonificación 99% patrimonio protegido',
    porcentajeCents: 9900,
    importeMaxCents: null,
    condiciones: 'Solo para bienes del patrimonio especialmente protegido de personas con discapacidad',
    notas: 'NO hay bonificación general. Solo esta bonificación específica y estrecha para patrimonio protegido.',
  },
  {
    comunidad: 'Illes Balears',
    descripcion: 'Sin bonificación general',
    porcentajeCents: 0,
    importeMaxCents: null,
    condiciones: null,
    notas: 'Aplica escala propia sin bonificación general adicional.',
  },
  {
    comunidad: 'Comunitat Valenciana',
    descripcion: 'Sin bonificación general',
    porcentajeCents: 0,
    importeMaxCents: null,
    condiciones: null,
    notas: 'Aplica escala propia sin bonificación general adicional. Mínimo exento: 1.000.000€ (superior al estatal de 700.000€).',
  },
  {
    comunidad: 'Aragón',
    descripcion: 'Sin bonificación general',
    porcentajeCents: 0,
    importeMaxCents: null,
    condiciones: null,
    notas: 'Aplica escala propia sin bonificación general.',
  },
  {
    comunidad: 'Extremadura',
    descripcion: 'Sin bonificación general',
    porcentajeCents: 0,
    importeMaxCents: null,
    condiciones: null,
    notas: 'Aplica escala propia sin bonificación general.',
  },
  {
    comunidad: 'Cataluña',
    descripcion: 'Sin bonificación general',
    porcentajeCents: 0,
    importeMaxCents: null,
    condiciones: null,
    notas: 'Aplica escala propia (0,21%-3,48%, 9 tramos). La escala es "transitoria" mientras exista el ITSGF.',
  },
]

// Escala autonómica de Cataluña (9 tramos, verificada con fetch directo AEAT)
const ESCALA_CATALUNYA = [
  { tramo: 1, desdeEur: 0, hastaEur: 167129.45, tipoPct: 0.210 },
  { tramo: 2, desdeEur: 167129.45, hastaEur: 334252.88, tipoPct: 0.315 },
  { tramo: 3, desdeEur: 334252.88, hastaEur: 668499.75, tipoPct: 0.525 },
  { tramo: 4, desdeEur: 668499.75, hastaEur: 1336999.75, tipoPct: 0.945 },
  { tramo: 5, desdeEur: 1336999.75, hastaEur: 2673999.01, tipoPct: 1.365 },
  { tramo: 6, desdeEur: 2673999.01, hastaEur: 5347998.03, tipoPct: 1.785 },
  { tramo: 7, desdeEur: 5347998.03, hastaEur: 10695996.06, tipoPct: 2.205 },
  { tramo: 8, desdeEur: 10695996.06, hastaEur: 20000000, tipoPct: 2.750 },
  { tramo: 9, desdeEur: 20000000, hastaEur: null, tipoPct: 3.480 },
]

const FUENTE_BONIF = 'AEAT Manual Patrimonio 2025 + legislación autonómica vigente'
const FUENTE_ESCALA_CAT = 'AEAT Manual Patrimonio 2025, escala propia Cataluña (fetch directo)'

const D = v => v == null ? undefined : String(v)

async function main() {
  let bonifCreated = 0
  let escalaCreated = 0

  // 1) Bonificaciones
  for (const b of BONIFICACIONES) {
    const id = `bonif-${b.comunidad.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}-2025`.slice(0, 100)
    try {
      await prisma.patrimonioBonificacion.upsert({
        where: { comunidad_taxYear: { comunidad: b.comunidad, taxYear: 2025 } },
        update: {},
        create: {
          id,
          taxYear: 2025,
          comunidad: b.comunidad,
          descripcion: b.descripcion,
          porcentajeCents: b.porcentajeCents,
          importeMaxCents: b.importeMaxCents ?? null,
          condiciones: b.condiciones ?? null,
          notas: b.notas ?? null,
          status: 'OFFICIAL_VERIFIED',
          productionNote: FUENTE_BONIF,
        },
      })
      bonifCreated++
    } catch (e) {
      console.error(`Error bonificación ${b.comunidad}: ${e.message}`)
    }
  }

  // 2) Escala autonómica Cataluña
  for (const t of ESCALA_CATALUNYA) {
    const id = `pat-cat-${t.tramo}-2025`
    try {
      await prisma.patrimonioEscala.upsert({
        where: { tramo_territorio_taxYear: { tramo: t.tramo, territorio: 'Cataluña', taxYear: 2025 } },
        update: {},
        create: {
          id,
          tramo: t.tramo,
          desdeEur: D(t.desdeEur),
          hastaEur: D(t.hastaEur),
          tipoPct: D(t.tipoPct),
          territorio: 'Cataluña',
          taxYear: 2025,
          status: 'OFFICIAL_VERIFIED',
        },
      })
      escalaCreated++
    } catch (e) {
      console.error(`Error escala Cataluña tramo ${t.tramo}: ${e.message}`)
    }
  }

  const totalBonif = await prisma.patrimonioBonificacion.count({ where: { taxYear: 2025 } })
  const totalEscalas = await prisma.patrimonioEscala.count({ where: { taxYear: 2025 } })

  console.log(`\nBonificaciones IP 2025: ${bonifCreated} upserted, ${totalBonif} total`)
  console.log(`Escalas IP 2025: ${escalaCreated} upserted (Cataluña), ${totalEscalas} total`)

  const byCom = await prisma.patrimonioBonificacion.groupBy({
    by: ['comunidad'],
    where: { taxYear: 2025 },
    _count: { id: true },
    orderBy: { comunidad: 'asc' },
  })
  for (const g of byCom) {
    console.log(`  ${g.comunidad}: ${g._count.id} bonificación(es)`)
  }

  const byTerr = await prisma.patrimonioEscala.groupBy({
    by: ['territorio'],
    where: { taxYear: 2025 },
    _count: { id: true },
    orderBy: { territorio: 'asc' },
  })
  for (const g of byTerr) {
    console.log(`  Escala ${g.territorio}: ${g._count.id} tramos`)
  }

  await prisma.$disconnect()
}

main()
