/**
 * Importa deducciones autonómicas IRPF 2025 (ejercicio 2026) para las 5 principales CCAA.
 * Fuentes: AEAT Manual Renta 2025, cap. 15; legislación autonómica vigente.
 * Ejecutar: node --experimental-modules packages/database/scripts/import-deducciones-autonomicas.mjs
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

const DEDUCCIONES = [
  // ═══════════════════════════════════════════════════════════════
  // MADRID — Ley 10/2001, 28 de diciembre, de medidas fiscales
  // ═══════════════════════════════════════════════════════════════
  {
    comunidad: 'Madrid (Comunidad de)',
    tipo: 'nacimiento',
    descripcion: 'Nacimiento o adopción de hijos',
    importeBaseCents: 72170,
    importeMaxCents: null,
    rentaMinimaCents: null,
    rentaMaximaCents: 3093000,
    duplicable: false,
    periodoAplicacion: 'nacimiento+2',
    notas: 'Individual ≤30.930€, conjunta ≤37.322€, UF ≤61.860€. Múltiples: +721,70€/hijo. Plena aplicación hasta rentaMinima; reducción lineal hasta rentaMaxima.',
  },
  {
    comunidad: 'Madrid (Comunidad de)',
    tipo: 'familia_numerosa',
    descripcion: 'Familia numerosa — 50% cuota autonómica',
    importeBaseCents: null,
    porcentaje: 50.00,
    importeMaxCents: 618600,
    duplicable: false,
    notas: 'Límite: 6.186€ individual, 12.372€ conjunto. Título familia numerosa obligatorio.',
  },
  {
    comunidad: 'Madrid (Comunidad de)',
    tipo: 'familia_numerosa_especial',
    descripcion: 'Familia numerosa especial — 100% cuota autonómica',
    importeBaseCents: null,
    porcentaje: 100.00,
    importeMaxCents: 1237200,
    duplicable: false,
    notas: 'Límite: 12.372€ individual, 24.744€ conjunto.',
  },
  {
    comunidad: 'Madrid (Comunidad de)',
    tipo: 'ascendientes',
    descripcion: 'Cuidado de ascendientes',
    importeBaseCents: 51550,
    importeMaxCents: null,
    rentaMinimaCents: null,
    rentaMaximaCents: 800000,
    duplicable: false,
    notas: '>65 años o discapacidad ≥33%. Rendimiento <8.000€/año. Convivencia.',
  },
  {
    comunidad: 'Madrid (Comunidad de)',
    tipo: 'alquiler',
    descripcion: 'Alquiler vivienda habitual',
    importeBaseCents: null,
    porcentaje: 20.00,
    importeMaxCents: 123720,
    rentaMinimaCents: null,
    rentaMaximaCents: 2500000,
    duplicable: false,
    notas: 'Menores de 40 años. Límite: 1.237,20€ de deducción. Reducción lineal con renta.',
  },
  {
    comunidad: 'Madrid (Comunidad de)',
    tipo: 'empleada_hogar',
    descripcion: 'Cuotas SS empleada del hogar',
    importeBaseCents: null,
    porcentaje: 20.00,
    importeMaxCents: 61860,
    duplicable: false,
    notas: 'Familia numerosa: 40% / 618,60€.',
  },
  {
    comunidad: 'Madrid (Comunidad de)',
    tipo: 'gastos_educativos',
    descripcion: 'Gastos escolares y educación',
    importeBaseCents: null,
    porcentaje: 15.00,
    importeMaxCents: null,
    duplicable: false,
    notas: 'Enseñanza reglada. Sin límite de renta.',
  },
  {
    comunidad: 'Madrid (Comunidad de)',
    tipo: 'hipoteca_jovenes',
    descripcion: 'Intereses hipoteca vivienda habitual (<30 años)',
    importeBaseCents: null,
    porcentaje: 15.00,
    importeMaxCents: 103100,
    duplicable: false,
    notas: 'Primer préstamo. Menores de 30 años. Límite: 1.031€.',
  },

  // ═══════════════════════════════════════════════════════════════
  // ANDALUCÍA — Ley 18/2005, 20 de diciembre, normas tributarias
  // ═══════════════════════════════════════════════════════════════
  {
    comunidad: 'Andalucía',
    tipo: 'nacimiento',
    descripcion: 'Nacimiento o adopción de hijos',
    importeBaseCents: 20000,
    importeMaxCents: null,
    rentaMinimaCents: null,
    rentaMaximaCents: null,
    duplicable: false,
    notas: '400€ si municipio <3.000 hab. +200€ múltiples. Sin límite de renta.',
  },
  {
    comunidad: 'Andalucía',
    tipo: 'familia_numerosa',
    descripcion: 'Familia numerosa general',
    importeBaseCents: 20000,
    importeMaxCents: null,
    rentaMinimaCents: null,
    rentaMaximaCents: 2500000,
    duplicable: false,
    notas: 'Ind: ≤25.000€ / Conj: ≤30.000€. Título familia numerosa obligatorio.',
  },
  {
    comunidad: 'Andalucía',
    tipo: 'familia_numerosa_especial',
    descripcion: 'Familia numerosa especial',
    importeBaseCents: 40000,
    importeMaxCents: null,
    rentaMinimaCents: null,
    rentaMaximaCents: 2500000,
    duplicable: false,
    notas: 'Ind: ≤25.000€ / Conj: ≤30.000€.',
  },
  {
    comunidad: 'Andalucía',
    tipo: 'alquiler',
    descripcion: 'Alquiler vivienda habitual',
    importeBaseCents: null,
    porcentaje: 15.00,
    importeMaxCents: 120000,
    rentaMinimaCents: null,
    rentaMaximaCents: 2500000,
    duplicable: false,
    notas: 'Límite: 1.200€ (1.500€ discapacidad). <35 o >65 años. Ind: ≤25.000€ / Conj: ≤30.000€.',
  },
  {
    comunidad: 'Andalucía',
    tipo: 'discapacidad_contribuyente',
    descripcion: 'Discapacidad del contribuyente',
    importeBaseCents: 15000,
    importeMaxCents: null,
    rentaMinimaCents: null,
    rentaMaximaCents: 2500000,
    duplicable: false,
    notas: 'Grado ≥33%. Ind: ≤25.000€ / Conj: ≤30.000€.',
  },
  {
    comunidad: 'Andalucía',
    tipo: 'gastos_educativos',
    descripcion: 'Gastos escolares y educación',
    importeBaseCents: null,
    porcentaje: 15.00,
    importeMaxCents: null,
    duplicable: false,
    notas: 'Sin límite de renta.',
  },
  {
    comunidad: 'Andalucía',
    tipo: 'ayuda_domestica',
    descripcion: 'Cuotas SS empleados del hogar',
    importeBaseCents: null,
    porcentaje: 15.00,
    importeMaxCents: null,
    duplicable: false,
    notas: 'Sin límite de renta.',
  },
  {
    comunidad: 'Andalucía',
    tipo: 'ejercicio_deporte',
    descripcion: 'Gastos actividades deportivas',
    importeBaseCents: null,
    porcentaje: 15.00,
    importeMaxCents: null,
    duplicable: false,
    notas: 'Instalaciones deportivas, gimnasio. Sin límite de renta.',
  },

  // ═══════════════════════════════════════════════════════════════
  // COMUNITAT VALENCIANA — Ley 13/2022, 27 de diciembre
  // ═══════════════════════════════════════════════════════════════
  {
    comunidad: 'Comunitat Valenciana',
    tipo: 'nacimiento',
    descripcion: 'Nacimiento o adopción de hijos',
    importeBaseCents: 60000,
    importeMaxCents: null,
    rentaMinimaCents: null,
    rentaMaximaCents: 3000000,
    duplicable: false,
    periodoAplicacion: 'nacimiento+2',
    notas: '1er hijo 600€, 2º 750€, 3º+ 900€. Ind: ≤30.000€ / Conj: ≤47.000€. Desde junio 2025.',
  },
  {
    comunidad: 'Comunitat Valenciana',
    tipo: 'familia_numerosa',
    descripcion: 'Familia numerosa general',
    importeBaseCents: 33000,
    importeMaxCents: null,
    rentaMinimaCents: null,
    rentaMaximaCents: 3000000,
    duplicable: false,
    notas: 'Ind: ≤27.000€ → 30.000€ / Conj: ≤44.000€ → 47.000€. Reducción lineal.',
  },
  {
    comunidad: 'Comunitat Valenciana',
    tipo: 'familia_numerosa_especial',
    descripcion: 'Familia numerosa especial',
    importeBaseCents: 66000,
    importeMaxCents: null,
    rentaMinimaCents: null,
    rentaMaximaCents: 3500000,
    duplicable: false,
    notas: 'Ind: ≤31.000€ → 35.000€ / Conj: ≤54.000€ → 58.000€.',
  },
  {
    comunidad: 'Comunitat Valenciana',
    tipo: 'alquiler',
    descripcion: 'Alquiler vivienda habitual',
    importeBaseCents: null,
    porcentaje: 15.00,
    importeMaxCents: 120000,
    rentaMinimaCents: null,
    rentaMaximaCents: 3000000,
    duplicable: false,
    notas: 'Límite: 1.200€ (1.500€ discapacidad). Menores de 35 o mayores de 65. Ind: ≤30.000€ / Conj: ≤47.000€.',
  },
  {
    comunidad: 'Comunitat Valenciana',
    tipo: 'ascendientes',
    descripcion: 'Ascendientes mayores de 75 años',
    importeBaseCents: null,
    importeMaxCents: null,
    duplicable: false,
    notas: 'Incompatible con deducción por discapacidad del ascendiente.',
  },

  // ═══════════════════════════════════════════════════════════════
  // GALICIA — Ley 19/2006, 14 de diciembre, medidas tributarias
  // ═══════════════════════════════════════════════════════════════
  {
    comunidad: 'Galicia',
    tipo: 'nacimiento',
    descripcion: 'Nacimiento o adopción de hijos',
    importeBaseCents: 36000,
    importeMaxCents: null,
    rentaMinimaCents: null,
    rentaMaximaCents: 2200000,
    duplicable: true,
    periodoAplicacion: 'nacimiento+2',
    notas: '1er hijo 360€, 2º 1.200€, 3º+ 2.400€. Si renta >22.000€: 300€/hijo. Duplicar si discapacidad ≥33%.',
  },
  {
    comunidad: 'Galicia',
    tipo: 'dos_hijos',
    descripcion: 'Dos hijos sin familia numerosa',
    importeBaseCents: 25000,
    importeMaxCents: null,
    duplicable: false,
    notas: 'Sin límite de renta. Incompatible con familia numerosa.',
  },
  {
    comunidad: 'Galicia',
    tipo: 'familia_numerosa',
    descripcion: 'Familia numerosa general',
    importeBaseCents: 25000,
    importeMaxCents: null,
    duplicable: true,
    notas: '250€ (2 hijos) + 250€ por adicional. Sin límite de renta. Discapacidad ≥65%: duplica.',
  },
  {
    comunidad: 'Galicia',
    tipo: 'familia_numerosa_especial',
    descripcion: 'Familia numerosa especial',
    importeBaseCents: 40000,
    importeMaxCents: null,
    duplicable: true,
    notas: '400€ (2 hijos). Sin límite de renta. Discapacidad ≥65%: duplica a 800€.',
  },
  {
    comunidad: 'Galicia',
    tipo: 'alquiler',
    descripcion: 'Alquiler vivienda habitual',
    importeBaseCents: null,
    porcentaje: 20.00,
    importeMaxCents: 60000,
    rentaMinimaCents: null,
    rentaMaximaCents: 2200000,
    duplicable: true,
    notas: '20% con 2+ hijos menores (10% sin). Límite: 600€ (300€ sin hijos). Menores de 35. Ind: ≤22.000€.',
  },

  // ═══════════════════════════════════════════════════════════════
  // CATALUÑA — Ley 22/2009, 29 de diciembre
  // ═══════════════════════════════════════════════════════════════
  {
    comunidad: 'Cataluña',
    tipo: 'nacimiento',
    descripcion: 'Nacimiento o adopción de hijos',
    importeBaseCents: 15000,
    importeMaxCents: null,
    duplicable: false,
    notas: '150€ individual / 300€ conjunta-monoparental. Sin límite de renta. Por cada hijo.',
  },
  {
    comunidad: 'Cataluña',
    tipo: 'alquiler',
    descripcion: 'Alquiler vivienda habitual',
    importeBaseCents: null,
    porcentaje: 10.00,
    importeMaxCents: 30000,
    rentaMinimaCents: null,
    rentaMaximaCents: 1800000,
    duplicable: false,
    notas: 'Límite: 300€. Menores de 36 años. Ind: ≤18.000€ / Conj: ≤30.000€.',
  },
  {
    comunidad: 'Cataluña',
    tipo: 'donativos',
    descripcion: 'Donativos lengua catalana',
    importeBaseCents: null,
    porcentaje: 15.00,
    importeMaxCents: null,
    duplicable: false,
    notas: 'Entidades que promueven la lengua catalana. Sin límite de renta.',
  },
  {
    comunidad: 'Cataluña',
    tipo: 'inversion_angel',
    descripcion: 'Ángel inversor — acciones nuevas',
    importeBaseCents: null,
    porcentaje: 30.00,
    importeMaxCents: null,
    duplicable: false,
    notas: 'Inversión en participaciones de empresas nuevas. Sin límite de renta.',
  },
  {
    comunidad: 'Cataluña',
    tipo: 'vivienda_habitual',
    descripcion: 'Adquisición vivienda habitual (tramo autonómico)',
    importeBaseCents: null,
    porcentaje: 3.00,
    importeMaxCents: null,
    duplicable: false,
    notas: 'Complemento a la deducción estatal. Inversión en vivienda habitual.',
  },
]

const FUENTE = 'AEAT Manual Renta 2025, cap. 15 (deducciones autonómicas) + legislación autonómica vigente'

async function main() {
  let created = 0
  let skipped = 0

  for (const d of DEDUCCIONES) {
    const id = `aut-${d.comunidad.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${d.tipo}-${d.descripcion.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-2025`
      .slice(0, 100)

    try {
      await prisma.deduccionAutonomica.upsert({
        where: { comunidad_tipo_descripcion_taxYear: { comunidad: d.comunidad, tipo: d.tipo, descripcion: d.descripcion, taxYear: 2025 } },
        update: {},
        create: {
          id,
          taxYear: 2025,
          comunidad: d.comunidad,
          tipo: d.tipo,
          descripcion: d.descripcion,
          importeBaseCents: d.importeBaseCents ?? null,
          porcentaje: d.porcentaje ?? null,
          importeMaxCents: d.importeMaxCents ?? null,
          rentaMinimaCents: d.rentaMinimaCents ?? null,
          rentaMaximaCents: d.rentaMaximaCents ?? null,
          duplicable: d.duplicable,
          periodoAplicacion: d.periodoAplicacion ?? null,
          notas: d.notas ?? null,
          status: 'OFFICIAL_VERIFIED',
          productionNote: FUENTE,
        },
      })
      created++
    } catch (e) {
      console.error(`Error inserting ${d.comunidad}/${d.tipo}: ${e.message}`)
      skipped++
    }
  }

  const total = await prisma.deduccionAutonomica.count({ where: { taxYear: 2025 } })
  console.log(`\nDeducciones autonómicas 2025: ${created} upserted, ${skipped} skipped, ${total} total in DB`)

  // Resumen por comunidad
  const byComunidad = await prisma.deduccionAutonomica.groupBy({
    by: ['comunidad'],
    where: { taxYear: 2025 },
    _count: { id: true },
    orderBy: { comunidad: 'asc' },
  })
  for (const g of byComunidad) {
    console.log(`  ${g.comunidad}: ${g._count.id} deducciones`)
  }

  await prisma.$disconnect()
}

main()
