/* eslint-disable no-console */
// Verifica/corrige fiscal_rates + anota IsTipo previsiones
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
for (const line of fs.readFileSync(path.join(__dirname, '..', '..', '..', '.env.local'), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const V = 'OFFICIAL_VERIFIED';
const F_LIS = 'https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328';
const F_RIRPF = 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-23999';
const F_LGT = 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-21297';
const F_SS26 = 'Orden PJC/297/2026, tipos cotización 2026 (RG y RETA)';

// [matchConcepto, data]
const UPDATES = [
  ['IVA tipo general', { notes: 'Art. 90 LIVA.', fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740', vigenteDesde: 1992 }],
  ['IVA tipo reducido', { notes: 'Art. 90 LIVA (alimentación, transporte, hostelería, vivienda nueva/reforma…).', fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740', vigenteDesde: 1992 }],
  ['IVA tipo superreducido', { notes: 'Art. 90 LIVA (productos básicos, medicamentos, libros…).', fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740', vigenteDesde: 1992 }],
  ['IVA exento', { notes: 'Art. 20 LIVA (operaciones exentas: sanidad, educación, seguros, viviendas usadas…).', fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740', vigenteDesde: 1992 }],
  ['Recargo de equivalencia — general', { notes: 'Art. 163 LIVA (comerciantes minoristas sin registro SII).', fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740', vigenteDesde: 2010 }],
  ['Recargo de equivalencia — reducido', { notes: 'Art. 163 LIVA.', fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740', vigenteDesde: 2010 }],
  ['Recargo de equivalencia — superreducido', { notes: 'Art. 163 LIVA.', fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740', vigenteDesde: 2010 }],
  ['Impuesto Sociedades — tipo general', { notes: 'Art. 28 LIS.', fuenteUrl: F_LIS, vigenteDesde: 2015 }],
  ['Impuesto Sociedades — entidad de nueva creación', { notes: 'Art. 29.1 LIS: primer ejercicio con beneficio y el siguiente.', fuenteUrl: F_LIS, vigenteDesde: 2015 }],
  ['Impuesto Sociedades — entidades sin fines lucrativos', { notes: 'Ley 49/2002, art. 27.', fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-25039', vigenteDesde: 2003 }],
  ['Impuesto Sociedades — ERD/PYME (1-10M€)', { notes: 'Art. 106 LIS: 23% sobre primeros 50.000€ de base imponible; resto 25%. Cifra negocios <10M€.', fuenteUrl: F_LIS, vigenteDesde: 2023 }],
  ['Impuesto Sociedades — micropyme, 1er tramo', { notes: 'Art. 29.2 LIS: 19% sobre primeros 50.000€; <12 trabajadores y cifra negocios <1M€.', fuenteUrl: F_LIS, vigenteDesde: 2023 }],
  ['Impuesto Sociedades — micropyme, resto', { notes: 'Art. 29.2 LIS: 21% sobre base restante.', fuenteUrl: F_LIS, vigenteDesde: 2023 }],
  ['Reserva de capitalización', { notes: 'Art. 25 LIS: reducción 10% del aumento de fondos propios mantenido 5 años; tributación efectiva 20%.', fuenteUrl: F_LIS, vigenteDesde: 2013 }],
  ['Exención de la cuota del IAE', { notes: 'Art. 83 LIS: personas físicas y sociedades con cifra negocios <1.000.000€ (desde 2023).', fuenteUrl: F_LIS, vigenteDesde: 2023 }],
  ['Pago fraccionado IRPF, estimación directa', { notes: 'Art. 110 LIRPF (modelo 130): 20% rendimientos netos acumulados; modelo 131 (objetiva) es cuota fija trimestral.', fuenteUrl: F_RIRPF, vigenteDesde: 2007 }],
  ['Recargo por presentación extemporánea sin requerimiento', { notes: 'Art. 27.2 LGT: 1% + 1% por cada mes completo de retraso (máx 15%). Tras requerimiento: intereses de demora + recargo 5/10/15% (art. 28 LGT).', fuenteUrl: F_LGT, vigenteDesde: 2004 }],
  ['Reducción por alquiler de vivienda habitual', { notes: 'Art. 18 LIRPF: 50% solo transitorio (contratos anteriores a 06/06/2023). Contratos posteriores: 50/60/70/90% según circunstancias.', fuenteUrl: F_RIRPF, vigenteDesde: 2015 }],
  ['Retención alquiler de local de negocio', { notes: 'Art. 100 RIRPF.', fuenteUrl: F_RIRPF, vigenteDesde: 2016 }],
  ['Retención capital mobiliario', { notes: 'Art. 101 RIRPF: primer tipo de la escala del ahorro (19%).', fuenteUrl: F_RIRPF, vigenteDesde: 2016 }],
  ['Retención IRPF a profesionales — general', { notes: 'Art. 95.1.a RIRPF.', fuenteUrl: F_RIRPF, vigenteDesde: 2015 }],
  ['Retención IRPF a profesionales — reducida', { notes: 'Art. 95.1.a RIRPF: nuevos profesionales en su primer año (salvo ingresos año anterior > límites).', fuenteUrl: F_RIRPF, vigenteDesde: 2015 }],
  ['Retención IRPF nómina al SMI', { notes: 'Art. 81.3 RIRPF: retención cero si rendimientos ≤ SMI anual y único pagador con pago por períodos mensuales.', fuenteUrl: F_RIRPF, vigenteDesde: 2015 }],
  ['Régimen General — contingencias comunes (empresa)', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['Régimen General — contingencias comunes (trabajador)', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['Régimen General — desempleo indefinido (empresa)', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['Régimen General — desempleo indefinido (trabajador)', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['Régimen General — desempleo temporal (empresa)', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['Régimen General — desempleo temporal (trabajador)', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['Régimen General — FOGASA', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['Régimen General — Formación Profesional (empresa)', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['Régimen General — Formación Profesional (trabajador)', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['Régimen General — MEI (empresa)', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 + '. MEI crece +0,17 pts/año desde 2027.' }],
  ['Régimen General — MEI (trabajador)', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 + '. MEI crece +0,17 pts/año desde 2027.' }],
  ['RETA — contingencias comunes', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['RETA — contingencias profesionales (AT/EP)', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['RETA — cese de actividad', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['RETA — formación profesional', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 }],
  ['RETA — MEI', { fuenteUrl: 'https://www.boe.es/eli/es/o/2026/03/24/pjpc297', vigenteDesde: 2026, notes: F_SS26 + '. MEI autónomos 0,90% en 2026.' }],
  ['Tarifa plana nuevos autónomos', { notes: 'RDL 13/2010 modificado (LPGE 2022): 80 €/mes durante 12 meses, prorrogable otros 12 si rendimiento neto ≤ SMI. Sujeta a prórrogas presupuestarias.', fuenteUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2010-4564', vigenteDesde: 2023 }],
];

(async () => {
  let ok = 0;
  for (const [concepto, data] of UPDATES) {
    const r = await prisma.fiscalRate.updateMany({
      where: { concepto, status: { not: 'OFFICIAL_VERIFIED' } },
      data: { ...data, status: V },
    });
    if (!r.count) console.log(`AVISO: sin filas para "${concepto}"`);
    else ok += r.count;
  }
  console.log(`filas verificadas: ${ok}`);

  // Corrección: sanción máxima por ocultación es 150% (LGT art. 183), no 200%
  const san = await prisma.fiscalRate.updateMany({
    where: { concepto: 'Sanción por no presentar sin requerimiento' },
    data: {
      concepto: 'Sanción máxima IRPF por ocultación',
      valor: 150,
      notes: 'LGT art. 183: 50/100/150% según leves/graves/muy graves. No presentar sin requerimiento: sanción fija 100€ por declaración sin deuda (art. 181).',
      fuenteUrl: F_LGT,
      vigenteDesde: 2004,
      status: V,
    },
  });
  console.log(`sanción corregida a 150%: ${san.count}`);

  // Corrección: SICAV ≠ fondos (fondos armonizados 0%)
  await prisma.fiscalRate.updateMany({
    where: { concepto: 'Impuesto Sociedades — SICAV / fondos de inversión' },
    data: {
      concepto: 'Impuesto Sociedades — SICAV',
      notes: 'Ley 5/2024: tipo 1% exige ≥100 partícipes o participación mínima 2.500€; en otro caso 25%.',
      fuenteUrl: 'https://www.boe.es/eli/es/l/2024/02/23/5',
      vigenteDesde: 2025,
      status: V,
    },
  });
  await prisma.fiscalRate.create({
    data: {
      id: crypto.randomUUID(),
      modeloRelacionado: 'MOD200',
      concepto: 'Impuesto Sociedades — fondos de inversión e IIC',
      valor: 0,
      notes: 'Art. 30.2 LIS: IIC armonizadas tributan al 0%.',
      fuenteUrl: F_LIS,
      vigenteDesde: 2015,
      status: V,
    },
  });
  console.log('SICAV separada + fila IIC 0% creada');

  // Umbral 3005,06€ (obsoleto) → umbrales reales art. 96 LIRPF (redacción RD-l 4/2024)
  const del = await prisma.fiscalRate.deleteMany({ where: { concepto: 'Umbral de declaración por tercero' } });
  console.log(`umbral obsoleto eliminado: ${del.count}`);
  const UMBRAL = 'https://www.boe.es/eli/es/dl/2024/06/05/4';
  const nuevosUmbral = [
    ['Obligación declarar IRPF — único pagador', 22000, 'Rendimientos trabajo >22.000€ con único pagador (o pagadores con retenciones aplicables a un solo tipo).'],
    ['Obligación declarar IRPF — segundo pagador y siguientes', 15876, 'Suma de segundos y siguientes pagadores >15.876€ (o compensaciones >1.500€, pensiones alimenticias, pagador no obligado a retener).'],
    ['Obligación declarar IRPF — intereses y dividendos', 2500, 'Rendimientos del capital mobiliario y ganancias no transmitidas >2.500€ anuales.'],
    ['Obligación declarar IRPF — todas las ganancias patrimoniales', 1000, 'Ganancias patrimoniales totales >1.000€ anuales.'],
    ['Obligación declarar IRPF — alquileres', 1000, 'Imputación de rentas inmobiliarias y letras >1.000€.'],
  ];
  for (const [c, v, n] of nuevosUmbral) {
    await prisma.fiscalRate.create({
      data: {
        id: crypto.randomUUID(),
        modeloRelacionado: 'MOD100',
        concepto: c,
        valor: v,
        baseCalculo: 'EUR',
        condicionAplicacion: n,
        fuenteUrl: UMBRAL,
        vigenteDesde: 2025,
        notes: 'Art. 96 LIRPF, redacción RD-l 4/2024 (vigente 2025-2026).',
        status: V,
      },
    });
  }
  console.log(`umbrales creados: ${nuevosUmbral.length}`);

  // IsTipo previsiones 2027-2029: documentar por qué siguen sin verificar
  const previsiones = await prisma.isTipo.findMany({ where: { OR: [{ status: { notIn: ['OFFICIAL_VERIFIED', 'OFFICIAL_UNVERIFIED'] } }, { previsto: true }] } });
  for (const p of previsiones) {
    await prisma.isTipo.update({
      where: { id: p.id },
      data: {
        productionNote:
          'Previsión: los tipos futuros dependen de presupuestos/deflactación anuales; VERI*FACTU B2B espera Orden Ministerial (RDL 15/2025). No usar en producción hasta confirmarse.',
      },
    });
  }
  console.log(`previsiones IS anotadas: ${previsiones.length}`);

  await prisma.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
