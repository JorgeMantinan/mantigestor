import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== FISCAL TABLE ROW COUNTS (all years) ===\n')

  const tables = [
    ['fiscal_sources', 'fiscalSource'],
    ['jurisdicciones', 'jurisdiction'],
    ['administraciones', 'administration'],
    ['tax_models', 'taxModel'],
    ['deadlines', 'deadline'],
    ['fiscal_rates', 'fiscalRate'],
    ['irpf_tramos_estatales', 'irpfTramoEstatal'],
    ['irpf_tramos_autonomicos', 'irpfTramoAutonomico'],
    ['irpf_tramos_ahorro', 'irpfTramoAhorro'],
    ['reta_tramos', 'retaTramo'],
    ['cotizaciones_seg_social', 'cotizacionSegSocial'],
    ['is_tipos', 'isTipo'],
    ['vat_rules', 'vatRule'],
    ['minimo_personal_familiar', 'minimoPersonalFamiliar'],
    ['reducciones_generales_irpf', 'reduccionGeneralIrpf'],
    ['isd_reglas', 'isdRegla'],
    ['itp_ajd_reglas', 'itpAjdRegla'],
    ['patrimonio_escala_estatal', 'patrimonioEscala'],
    ['sanciones', 'sancion'],
    ['amortizacion_dietas_km', 'amortizacionDietaKm'],
    ['umbrales_tamano_empresa', 'umbralTamanoEmpresa'],
    ['reglas_territoriales', 'reglaTerritorial'],
    ['estados_verificacion', 'estadoVerificacion'],
    ['auditoria_correcciones', 'auditoriaCorreccion'],
    ['import_log', 'importRun'],
    ['data_quality_errors', 'dataQualityError'],
  ]

  for (const [tableName, modelName] of tables) {
    try {
      const count = await prisma[modelName].count()
      console.log(`  ${tableName}: ${count} rows`)
    } catch (e) {
      console.log(`  ${tableName}: ERROR - ${e.message?.slice(0, 80)}`)
    }
  }

  console.log('\n=== REDUCCIONES GENERALES IRPF — ALL ROWS ===\n')
  const reducciones = await prisma.reduccionGeneralIrpf.findMany({
    select: {
      id: true,
      concepto: true,
      importeEur: true,
      formulaTexto: true,
      taxYear: true,
      status: true,
    },
    orderBy: [{ taxYear: 'asc' }, { concepto: 'asc' }],
  })
  for (const r of reducciones) {
    console.log(`  [${r.taxYear}] ${r.concepto} | ${r.importeEur ?? r.formulaTexto} | ${r.status}`)
  }

  console.log('\n=== REDUCCIONES — checking for any territorio/CCAA column ===\n')
  const reduccionColumns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'reducciones_generales_irpf'
    ORDER BY ordinal_position
  `)
  console.log('  Columns in reducciones_generales_irpf:')
  for (const col of reduccionColumns) {
    console.log(`    ${col.column_name} (${col.data_type})`)
  }

  console.log('\n=== IRPF TRAMOS ESTATALES — taxYear distribution ===\n')
  const tramosEstatalesByYear = await prisma.irpfTramoEstatal.groupBy({
    by: ['taxYear'],
    _count: { id: true },
    orderBy: { taxYear: 'asc' },
  })
  for (const g of tramosEstatalesByYear) {
    console.log(`  ${g.taxYear}: ${g._count.id} tramos`)
  }

  console.log('\n=== IRPF TRAMOS AUTONOMICOS — taxYear distribution ===\n')
  const tramosAutByYear = await prisma.irpfTramoAutonomico.groupBy({
    by: ['taxYear'],
    _count: { id: true },
    orderBy: { taxYear: 'asc' },
  })
  for (const g of tramosAutByYear) {
    console.log(`  ${g.taxYear}: ${g._count.id} tramos`)
  }

  console.log('\n=== IRPF TRAMOS AUTONOMICOS — comunidades with 2025 data ===\n')
  const comunidades2025 = await prisma.irpfTramoAutonomico.groupBy({
    by: ['comunidad'],
    where: { taxYear: 2025 },
    _count: { id: true },
  })
  for (const g of comunidades2025) {
    console.log(`  ${g.comunidad}: ${g._count.id} tramos`)
  }

  console.log('\n=== IRPF TRAMOS AUTONOMICOS — comunidades with 2026 data ===\n')
  const comunidades2026 = await prisma.irpfTramoAutonomico.groupBy({
    by: ['comunidad'],
    where: { taxYear: 2026 },
    _count: { id: true },
  })
  for (const g of comunidades2026) {
    console.log(`  ${g.comunidad}: ${g._count.id} tramos`)
  }
  if (!comunidades2026.length) console.log('  (none)')

  console.log('\n=== MINIMO PERSONAL FAMILIAR — taxYear + territorio distribution ===\n')
  const minimosByYear = await prisma.minimoPersonalFamiliar.groupBy({
    by: ['taxYear'],
    _count: { id: true },
    orderBy: { taxYear: 'asc' },
  })
  for (const g of minimosByYear) {
    console.log(`  ${g.taxYear}: ${g._count.id} rows`)
  }

  console.log('\n=== MINIMO PERSONAL FAMILIAR — territorios with 2026 data ===\n')
  const territorios2026 = await prisma.minimoPersonalFamiliar.groupBy({
    by: ['territorio'],
    where: { taxYear: 2026 },
    _count: { id: true },
  })
  for (const g of territorios2026) {
    console.log(`  ${g.territorio}: ${g._count.id} rows`)
  }
  if (!territorios2026.length) console.log('  (none)')

  console.log('\n=== IRPF TRAMOS AHORRO — taxYear + territorio distribution ===\n')
  const ahorroByYear = await prisma.irpfTramoAhorro.groupBy({
    by: ['taxYear'],
    _count: { id: true },
    orderBy: { taxYear: 'asc' },
  })
  for (const g of ahorroByYear) {
    console.log(`  ${g.taxYear}: ${g._count.id} rows`)
  }

  console.log('\n=== IRPF TRAMOS AHORRO — territorios with 2026 data ===\n')
  const ahorroTerr2026 = await prisma.irpfTramoAhorro.groupBy({
    by: ['territorio'],
    where: { taxYear: 2026 },
    _count: { id: true },
  })
  for (const g of ahorroTerr2026) {
    console.log(`  ${g.territorio}: ${g._count.id} rows`)
  }
  if (!ahorroTerr2026.length) console.log('  (none)')

  console.log('\n=== FISCAL_SOURCES — count by authority ===\n')
  const sourcesByAuth = await prisma.fiscalSource.groupBy({
    by: ['authority'],
    _count: { id: true },
  })
  for (const g of sourcesByAuth) {
    console.log(`  ${g.authority}: ${g._count.id} sources`)
  }

  console.log('\n=== FISCAL_SOURCES — checking for autonomic deduction entries ===\n')
  const autonomicSources = await prisma.fiscalSource.findMany({
    where: {
      OR: [
        { title: { contains: 'deduccion', mode: 'insensitive' } },
        { title: { contains: 'deducción', mode: 'insensitive' } },
        { title: { contains: 'autonomic', mode: 'insensitive' } },
        { title: { contains: 'autonóm', mode: 'insensitive' } },
        { title: { contains: 'comunidad', mode: 'insensitive' } },
        { notes: { contains: 'deduccion', mode: 'insensitive' } },
        { notes: { contains: 'deducción', mode: 'insensitive' } },
      ],
    },
    select: { id: true, title: true, authority: true, taxYear: true },
    take: 20,
  })
  for (const s of autonomicSources) {
    console.log(`  ${s.id} | ${s.title} | ${s.authority} | ${s.taxYear}`)
  }
  if (!autonomicSources.length) console.log('  (none found)')

  console.log('\n=== JURISDICCIONES — all rows ===\n')
  const jurisdictions = await prisma.jurisdiction.findMany({
    select: { id: true, name: true, type: true, active: true },
    orderBy: { id: 'asc' },
  })
  for (const j of jurisdictions) {
    console.log(`  ${j.id} | ${j.name} | ${j.type} | active=${j.active}`)
  }

  console.log('\n=== REGLAS TERRITORIALES — all rows ===\n')
  const reglasTerr = await prisma.reglaTerritorial.findMany({
    select: { id: true, tax: true, scope: true, rule: true, jurisdictionId: true, taxYear: true, status: true },
    orderBy: { id: 'asc' },
  })
  for (const r of reglasTerr) {
    console.log(`  ${r.id} | ${r.tax} | ${r.scope} | ${r.rule?.slice(0, 60)} | J=${r.jurisdictionId} | ${r.taxYear} | ${r.status}`)
  }
  if (!reglasTerr.length) console.log('  (none)')

  console.log('\n=== DEDUCCIONES TABLE CHECK ===\n')
  const deduccionTables = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%deducci%' OR table_name LIKE '%deduccion%'
    ORDER BY table_name
  `)
  for (const t of deduccionTables) {
    console.log(`  ${t.table_name}`)
  }
  if (!deduccionTables.length) console.log('  (no deducciones-specific table exists)')

  console.log('\n=== COTIZACIONES SEG SOCIAL — taxYear distribution ===\n')
  const cotizByYear = await prisma.cotizacionSegSocial.groupBy({
    by: ['taxYear'],
    _count: { id: true },
    orderBy: { taxYear: 'asc' },
  })
  for (const g of cotizByYear) {
    console.log(`  ${g.taxYear}: ${g._count.id} rows`)
  }

  console.log('\n=== DEADLINES — taxYear distribution ===\n')
  const deadlinesByYear = await prisma.deadline.groupBy({
    by: ['taxYear'],
    _count: { id: true },
    orderBy: { taxYear: 'asc' },
  })
  for (const g of deadlinesByYear) {
    console.log(`  ${g.taxYear}: ${g._count.id} rows`)
  }

  console.log('\n=== IS TIPOS — taxYear distribution ===\n')
  const isByYear = await prisma.isTipo.groupBy({
    by: ['taxYear'],
    _count: { id: true },
    orderBy: { taxYear: 'asc' },
  })
  for (const g of isByYear) {
    console.log(`  ${g.taxYear}: ${g._count.id} rows`)
  }

  console.log('\n=== VAT RULES — taxYear distribution ===\n')
  const vatByYear = await prisma.vatRule.groupBy({
    by: ['taxYear'],
    _count: { id: true },
    orderBy: { taxYear: 'asc' },
  })
  for (const g of vatByYear) {
    console.log(`  ${g.taxYear}: ${g._count.id} rows`)
  }

  console.log('\n=== PATRIMONIO ESCALA — taxYear distribution ===\n')
  const patByYear = await prisma.patrimonioEscala.groupBy({
    by: ['taxYear'],
    _count: { id: true },
    orderBy: { taxYear: 'asc' },
  })
  for (const g of patByYear) {
    console.log(`  ${g.taxYear}: ${g._count.id} rows`)
  }

  console.log('\n=== RETA TRAMOS — taxYear distribution ===\n')
  const retaByYear = await prisma.retaTramo.groupBy({
    by: ['taxYear'],
    _count: { id: true },
    orderBy: { taxYear: 'asc' },
  })
  for (const g of retaByYear) {
    console.log(`  ${g.taxYear}: ${g._count.id} rows`)
  }

  console.log('\n=== ISD REGLAS — count ===\n')
  const isdCount = await prisma.isdRegla.count()
  console.log(`  Total: ${isdCount} rows`)

  console.log('\n=== ITP AJD REGLAS — count ===\n')
  const itpCount = await prisma.itpAjdRegla.count()
  console.log(`  Total: ${itpCount} rows`)

  console.log('\n=== SANCIONES — count ===\n')
  const sancCount = await prisma.sancion.count()
  console.log(`  Total: ${sancCount} rows`)

  console.log('\n=== AMORTIZACION DIETA KM — count ===\n')
  const amortCount = await prisma.amortizacionDietaKm.count()
  console.log(`  Total: ${amortCount} rows`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
