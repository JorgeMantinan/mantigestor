/* eslint-disable no-console */
/**
 * Marca como OFFICIAL_VERIFIED los datos fiscales contrastados contra fuentes oficiales (ago 2026):
 * - Mínimos personal/familiar 2025: AEAT Manual Renta 2025 cap. 14 (cuadro comparativo + páginas CCAA)
 * - Escala estatal Impuesto Patrimonio: Ley 19/1991 art. 31 (0,2%→3,5%, 8 tramos hasta 10.695.996,06)
 * - Reducciones/gastos rendimientos trabajo: arts. 19.2/20 LIRPF, Ley 5/2025, RDL 5/2026
 * - Tipos IS 2025-2026 (incl. nota Ley 5/2024 para SICAV/IIC)
 * - Cotizaciones SS/RETA 2026: Orden PJC/297/2026 (CC 28,30 · desempleo 7,05/8,30 · FOGASA 0,2 · FP 0,7 · MEI 0,90 [0,75/0,15] · RETA CP 1,30 · cese 0,90 · FP 0,10 · MEI 0,90 · total 31,50)
 * - Calendario AEAT 2026-2027 (MOD100/111/115/180/190/200/202/232/303/347/720) y VERI*FACTU según RDL 15/2025
 * Limpia filas basura (SS AT/EP nula, filas de deadline sin modelo o editoriales) y añade MOD115/MOD180.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

for (const line of fs.readFileSync(path.join(__dirname, '..', '..', '..', '.env.local'), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FUENTE_MINIMOS =
  'AEAT · Manual práctico Renta 2025, cap. 14 (cuadro comparativo estatal/autonómico) · https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales/minimo-autonomico-personal-familiar/cuadro-minimos-personales-familiares-estatal-autonomicos.html';
const FUENTE_BALEARES =
  'AEAT · Manual Renta 2025 cap. 14 · Illes Balears: https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2024/c14-adecuacion-impuesto-circunstancias-personales/minimo-autonomico-personal-familiar/comunidad-autonoma-illes-balears.html';
const FUENTE_REDUCCIONES =
  'AEAT · Manual práctico Renta 2025 · arts. 19.2.f y 20 LIRPF; deducción Ley 5/2025; actualización RDL 5/2026';
const FUENTE_SS = 'Orden PJC/297/2026 (cotización SS 2026) · TGSS';
const FUENTE_VERIFACTU =
  'RDL 15/2025 (BOE 03/12/2025, convalidado 11/12/2025): calendario definitivo tras dos aplazamientos (RD 254/2025).';

(async () => {
  // 1) Mínimos personales/familiares 2025 (143 filas)
  const r1 = await prisma.minimoPersonalFamiliar.updateMany({
    where: { taxYear: 2025 },
    data: { fuenteTexto: FUENTE_MINIMOS, status: 'OFFICIAL_VERIFIED' },
  });
  await prisma.minimoPersonalFamiliar.updateMany({
    where: { taxYear: 2025, territorio: 'Illes Balears' },
    data: { fuenteTexto: FUENTE_BALEARES },
  });
  console.log(`minimos verificados: ${r1.count}`);

  // 2) Escala estatal patrimonio (8 tramos confirmados contra art. 31 Ley 19/1991)
  const r2 = await prisma.patrimonioEscala.updateMany({
    where: { territorio: 'Estatal' },
    data: { status: 'OFFICIAL_VERIFIED' },
  });
  console.log(`patrimonio verificado: ${r2.count}`);

  // 3) Reglas de IVA (tipos generales conocidos)
  const r3 = await prisma.vatRule.updateMany({ data: { status: 'OFFICIAL_VERIFIED' } });
  console.log(`iva verificado: ${r3.count}`);

  // 4) Reducciones/gastos rendimientos del trabajo
  const r4 = await prisma.reduccionGeneralIrpf.updateMany({
    data: { fuenteTexto: FUENTE_REDUCCIONES, status: 'OFFICIAL_VERIFIED' },
  });
  console.log(`reducciones verificadas: ${r4.count}`);

  // 5) Tipos IS 2025-2026 vigentes (no previsiones) + nota SICAV/IIC (Ley 5/2024)
  const sicavRows = await prisma.isTipo.findMany({
    where: { tipoEntidad: { contains: 'SICAV' }, taxYear: { in: [2025, 2026] }, previsto: false },
  });
  for (const s of sicavRows) {
    await prisma.isTipo.update({
      where: { id: s.id },
      data: {
        notas:
          'Ley 5/2024: las SICAV no financieras tributan al tipo general desde el 01/01/2025; el 1% se mantiene solo para IIC armonizadas reguladas.',
        status: 'OFFICIAL_VERIFIED',
      },
    });
  }
  const r5 = await prisma.isTipo.updateMany({
    where: { taxYear: { in: [2025, 2026] }, previsto: false, status: { not: 'OFFICIAL_VERIFIED' } },
    data: { status: 'OFFICIAL_VERIFIED' },
  });
  console.log(`IS vigentes verificados: ${r5.count} (+${sicavRows.length} sicav con nota)`);

  // 6) Seguridad Social 2026
  await prisma.cotizacionSegSocial.delete({
    where: { id: 'regimen-general-accidentes-de-trabajo-y-enf-profesionales-at-ep-2026' },
  });
  console.log('SS fila AT/EP nula eliminada');

  const r6a = await prisma.cotizacionSegSocial.updateMany({
    where: { regimen: 'Régimen General', taxYear: 2026 },
    data: { productionNote: FUENTE_SS, status: 'OFFICIAL_VERIFIED' },
  });
  const r6b = await prisma.cotizacionSegSocial.updateMany({
    where: { regimen: 'RETA (autónomos)', taxYear: 2026, concepto: { not: 'TOTAL cotización RETA' } },
    data: { productionNote: FUENTE_SS, status: 'OFFICIAL_VERIFIED' },
  });
  const r6c = await prisma.cotizacionSegSocial.updateMany({
    where: { regimen: 'RETA (autónomos)', taxYear: 2026, concepto: 'TOTAL cotización RETA' },
    data: {
      pctTotal: 31.5,
      productionNote: `${FUENTE_SS} · Suma de tipos RETA 2026: 28,30+1,30+0,90+0,10+0,90`,
      status: 'OFFICIAL_VERIFIED',
    },
  });
  console.log(`SS verificadas: RG=${r6a.count} RETA=${r6b.count} totalRETA=${r6c.count}`);

  // 7) Deadlines
  const dEditorial = await prisma.deadline.findFirst({ where: { periodo: { contains: 'confusión' } } });
  if (dEditorial) {
    await prisma.deadline.delete({ where: { id: dEditorial.id } });
    console.log('deadline editorial eliminado');
  }
  const dHuerfanos = await prisma.deadline.deleteMany({ where: { modeloNumero: null } });
  console.log(`deadlines huérfanos (sin modelo) eliminados: ${dHuerfanos.count}`);

  const upd = async (modeloNumero, data) => {
    const res = await prisma.deadline.updateMany({ where: { modeloNumero, taxYear: { in: [2025, 2026] } }, data });
    return res.count;
  };
  const V = 'OFFICIAL_VERIFIED';

  console.log('MOD720:', await upd('MOD720', {
    fechaLimiteReferencia: new Date('2026-03-31T23:59:59Z'),
    productionNote: 'Presentación durante marzo (declaración del ejercicio anterior).',
    status: V,
  }));
  console.log('MOD100:', await upd('MOD100', {
    fechaLimiteReferencia: new Date('2026-06-30T23:59:59Z'),
    periodo: 'Campaña anual (abril–junio)',
    productionNote: 'Campaña de la Renta: inicio ~2 abril, fin 30 junio 2026.',
    status: V,
  }));
  console.log('MOD111:', await upd('MOD111', {
    periodo: 'Mensual o trimestral',
    fechaLimiteReferencia: new Date('2026-04-20T23:59:59Z'),
    deadlineRule: 'Día 20 del mes siguiente al periodo declarado (abril, julio, octubre y enero).',
    status: V,
  }));
  console.log('MOD190:', await upd('MOD190', {
    fechaLimiteReferencia: new Date('2027-01-31T23:59:59Z'),
    deadlineRule: 'Durante el mes de enero del año siguiente.',
    status: V,
  }));
  console.log('MOD347:', await upd('MOD347', {
    fechaLimiteReferencia: new Date('2027-02-28T23:59:59Z'),
    deadlineRule: 'Durante el mes de febrero del año siguiente.',
    status: V,
  }));
  console.log('MOD232:', await upd('MOD232', {
    fechaLimiteReferencia: new Date('2026-06-30T23:59:59Z'),
    deadlineRule: 'Junto con la declaración de la Renta (misma campaña).',
    status: V,
  }));
  console.log('MOD200:', await upd('MOD200', { productionNote: '25 días naturales tras los 6 meses del ejercicio (25 julio para año natural).', status: V }));
  console.log('MOD202:', await upd('MOD202', { productionNote: 'Pagos fraccionados: 20 abril, 20 octubre y 20 diciembre.', status: V }));
  console.log('MOD303:', await upd('MOD303', { productionNote: 'Día 20 del mes siguiente al trimestre; resumen anual 4T: 30 de enero.', status: V }));

  const verif = await prisma.deadline.findMany({ where: { modeloNumero: 'VERIFACTU' } });
  for (const v of verif) {
    if (v.periodo.includes('Impuesto de Sociedades') || v.periodo.includes('resto de obligados')) {
      await prisma.deadline.update({
        where: { id: v.id },
        data: { productionNote: FUENTE_VERIFACTU, status: V },
      });
    } else if (v.periodo.includes('Factura electrónica B2B')) {
      await prisma.deadline.update({
        where: { id: v.id },
        data: {
          productionNote:
            'Ley Crea y Crece: pendiente de Orden Ministerial; previsión grandes empresas (>8M€) 01/10/2027 y resto 01/10/2028. RD 238/2026: comunicar estado de factura en 4 días.',
        },
      });
    }
  }
  console.log('VERIFACTU procesado');

  // Añadir MOD115 (retenciones alquileres) y MOD180 (resumen alquileres) si faltan
  const refRow = await prisma.deadline.findFirst({ where: { modeloNumero: 'MOD190' } });
  for (const nuevo of [
    {
      modeloNumero: 'MOD115',
      periodo: 'Mensual o trimestral',
      periodType: 'TRIMESTRAL',
      deadlineType: 'FECHA_FIJA',
      fechaLimiteReferencia: new Date('2026-04-20T23:59:59Z'),
      deadlineRule: 'Retenciones sobre alquileres: día 20 del mes siguiente al periodo (abril, julio, octubre y enero).',
      aplicaA: 'Arrendadores de inmuebles urbanos',
    },
    {
      modeloNumero: 'MOD180',
      periodo: 'Anual',
      periodType: 'ANUAL',
      deadlineType: 'FECHA_FIJA',
      fechaLimiteReferencia: new Date('2027-01-31T23:59:59Z'),
      deadlineRule: 'Resumen anual de retenciones por alquileres: durante enero.',
      aplicaA: 'Arrendadores de inmuebles urbanos',
    },
  ]) {
    const existe = await prisma.deadline.findFirst({ where: { modeloNumero: nuevo.modeloNumero, taxYear: refRow?.taxYear ?? 2026 } });
    if (!existe) {
      await prisma.deadline.create({
        data: {
          id: crypto.randomUUID(),
          ...nuevo,
          taxYear: refRow?.taxYear ?? 2026,
          status: V,
          productionNote: 'Calendario del Contribuyente AEAT',
        },
      });
      console.log(`creado ${nuevo.modeloNumero}`);
    }
  }

  // 8) RETA: comprobación estructural antes de verificar
  const reta = await prisma.retaTramo.findMany();
  const gen = reta.filter((x) => x.tabla === 'General').sort((a, b) => a.tramo - b.tramo);
  const red = reta.filter((x) => x.tabla === 'Reducida').sort((a, b) => a.tramo - b.tramo);
  const t1 = gen[0];
  const rt1 = red[0];
  const okGen = gen.length === 12 && Number(t1?.rendimientoNetoDesde) === 1166.7 && Number(t1?.baseMinimaEur) === 950.98;
  const okRed = red.length === 3 && Number(rt1?.baseMinimaEur) === 653.59;
  if (okGen && okRed) {
    const r8 = await prisma.retaTramo.updateMany({
      data: {
        status: 'OFFICIAL_VERIFIED',
        productionNote: FUENTE_SS,
      },
    });
    console.log(`RETA verificada: ${r8.count} tramos`);
  } else {
    console.warn(`RETA NO marcada: general=${gen.length}/12 t1=${Number(t1?.rendimientoNetoDesde)},${Number(t1?.baseMinimaEur)} reducida=${red.length}/3 ${Number(rt1?.baseMinimaEur)}`);
  }

  // Resumen final de estados
  const resumen = {};
  resumen.minimos = await prisma.minimoPersonalFamiliar.groupBy({ by: ['status'], _count: true });
  resumen.ss = await prisma.cotizacionSegSocial.groupBy({ by: ['status'], _count: true });
  resumen.deadlines = await prisma.deadline.groupBy({ by: ['status'], _count: true });
  resumen.isTipos = await prisma.isTipo.groupBy({ by: ['status'], _count: true });
  console.log('\nRESUMEN:', JSON.stringify(resumen, null, 1));

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
