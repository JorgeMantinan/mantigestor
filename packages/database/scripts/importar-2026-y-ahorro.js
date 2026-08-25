/* eslint-disable no-console */
// Importa: escalas del ahorro (común/PV/Navarra), mínimos Ceuta/Melilla y clonación 2025→2026
// marcada como no verificada donde falten fuentes primarias.
const fs = require('fs');
const path = require('path');
for (const line of fs.readFileSync(path.join(__dirname, '..', '..', '..', '.env.local'), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const uid = () => crypto.randomUUID();

const V = 'OFFICIAL_VERIFIED';
const U = 'OFFICIAL_UNVERIFIED';

const F_AHORRO_COMUN =
  'Art. 63 LIRPF (tarifa base liquidable del ahorro) + Ley 7/2024 de 20-dic (BOE-A-2024-26694, último tramo 30% con efectos 1-1-2025) · contrastado con AEAT Manual Renta 2025: https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-aplicable-contribuyentes-irpf-residentes-extranjero/gravamen-base-liquidable-ahorro.html';
const F_AHORRO_PV_2025 =
  'Escalas del ahorro armonizadas Álava/Bizkaia/Gipuzkoa vigentes hasta 31-12-2025 · Normas Forales IRPV + tabla Hacienda Foral Bizkaia Renta 2025: https://gidak.bizkaia.eus/content/imagenes/Renta/2025/siac11331RENTA2025TABLAES.pdf';
const F_AHORRO_PV_2026 =
  'Art. 76 NF 13/2013 del IRPF (redacción NF 2/2025), BOB · nueva escala de 9 tramos idéntica en Álava/Bizkaia/Gipuzkoa (NF 6/2025 Gipuzkoa; NF 21/2025 Álava), rige desde el ejercicio 2026 · verificado ago-2026 contra tabla oficial cotejada con BOB: https://guiafiscal.es/irpf/tablas-irpf-bizkaia/';
const F_AHORRO_NAVARRA =
  'Art. 60 TRLIRPF Navarra (DF Legislativo 1/2008, redacción Ley Foral 22/2023) · escala 2026 sin modificaciones según LF 17/2025: https://www.navarra.es/NR/rdonlyres/9F0B796F-D699-4BEF-87E2-0BB39D86C9FC/0/TRLFIRPFv62.html';

// [tramo, desde, hasta|null, pct]
const AHORRO_COMUN = [
  [1, 0, 6000, 19], [2, 6000, 50000, 21], [3, 50000, 200000, 23], [4, 200000, 300000, 27], [5, 300000, null, 30],
];
const AHORRO_PV_2025 = [
  [1, 0, 2500, 20], [2, 2500, 10000, 21], [3, 10000, 15000, 22], [4, 15000, 30000, 23], [5, 30000, null, 25],
];
// Límite 2º tramo 15.000 € (errata 15.500 de fuente secundaria corregida; cuota acumulada oficial 2.925 € en 15.000)
const AHORRO_PV_2026 = [
  [1, 0, 7500, 19], [2, 7500, 15000, 20], [3, 15000, 30000, 22], [4, 30000, 50000, 24],
  [5, 50000, 90000, 25.5], [6, 90000, 120000, 26], [7, 120000, 240000, 26.5], [8, 240000, 300000, 27], [9, 300000, null, 28],
];
const AHORRO_NAVARRA = [
  [1, 0, 6000, 20], [2, 6000, 10000, 22], [3, 10000, 15000, 24], [4, 15000, 200000, 26],
  [5, 200000, 300000, 27], [6, 300000, null, 28],
];

const TERRITORIOS_PV = ['País Vasco - Álava', 'País Vasco - Bizkaia', 'País Vasco - Gipuzkoa'];

function filasAhorro(territorio, regimen, taxYear, defs, status, fuente) {
  return defs.map(([tramo, desde, hasta, pct]) => ({
    territorio, regimen, taxYear, tramo,
    desdeEur: desde, hastaEur: hasta, tipoPct: pct,
    notas: null, fuenteTexto: fuente, status,
  }));
}

(async () => {
  let n = 0;
  const upsertAhorro = async (r) => {
    await prisma.irpfTramoAhorro.upsert({
      where: { territorio_tramo_taxYear: { territorio: r.territorio, tramo: r.tramo, taxYear: r.taxYear } },
      update: { desdeEur: r.desdeEur, hastaEur: r.hastaEur, tipoPct: r.tipoPct, regimen: r.regimen, notas: r.notas, fuenteTexto: r.fuenteTexto, status: r.status },
      create: { id: uid(), ...r },
    });
    n++;
  };

  // ── 1. Escalas del ahorro ──────────────────────────────────────────────
  for (const year of [2025, 2026]) {
    for (const f of filasAhorro('Común', 'Comun', year, AHORRO_COMUN, V, F_AHORRO_COMUN)) await upsertAhorro(f);
    for (const t of TERRITORIOS_PV) for (const f of filasAhorro(t, 'Comun', 2025, AHORRO_PV_2025, V, F_AHORRO_PV_2025)) await upsertAhorro(f);
    for (const t of TERRITORIOS_PV) for (const f of filasAhorro(t, 'Comun', 2026, AHORRO_PV_2026, V, F_AHORRO_PV_2026)) await upsertAhorro(f);
    for (const f of filasAhorro('Navarra (Comunidad Foral de)', 'Comun', year, AHORRO_NAVARRA, V, F_AHORRO_NAVARRA)) await upsertAhorro(f);
  }
  console.log(`escala_ahorro filas escritas: ${n}`);

  // ── 2. Mínimos explícitos Ceuta/Melilla 2025 (= referencia estatal) ────
  const estatales25 = await prisma.minimoPersonalFamiliar.findMany({ where: { territorio: 'Estatal (referencia común)', taxYear: 2025 } });
  const F_MIN_CMY =
    'AEAT · Manual Renta 2025, cap. 14 (mínimo personal y familiar) · Ceuta/Melilla aplican los mismos importes que la referencia estatal en 2025: https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-minimo-personal-familiar.html';
  let mcm = 0;
  for (const terr of ['Ceuta', 'Melilla']) {
    for (const r of estatales25) {
      await prisma.minimoPersonalFamiliar.upsert({
        where: { territorio_concepto_taxYear: { territorio: terr, concepto: r.concepto, taxYear: 2025 } },
        update: { importeEur: r.importeEur, fuenteTexto: F_MIN_CMY, status: V },
        create: { id: uid(), territorio: terr, concepto: r.concepto, importeEur: r.importeEur, notas: null, fuenteTexto: F_MIN_CMY, taxYear: 2025, status: V },
      });
      mcm++;
    }
  }
  console.log(`minimos Ceuta/Melilla 2025: ${mcm} (base ${estatales25.length})`);

  // ── 3. Clonación 2025 → 2026 ───────────────────────────────────────────
  const NOTA_26 = 'Sin datos oficiales completos para el ejercicio 2026 al importar; valor idéntico a 2025 salvo actualización normativa posterior. Verificar con la publicación oficial del ejercicio.';
  let c = 0;

  // 3a. Escala estatal general 2026: art. 63 LIRPF sin cambios desde Ley 11/2020 (fuente estatutaria)
  const F_ESTATAL_26 = 'Art. 63.1 LIRPF (tarifa estatal, sin cambios desde Ley 11/2020 de Presupuestos) · confirmado para 2026: https://guiafiscal.es/irpf/tramos-irpf-2026';
  for (const r of await prisma.irpfTramoEstatal.findMany({ where: { taxYear: 2025 } })) {
    await prisma.irpfTramoEstatal.upsert({
      where: { tramo_taxYear: { tramo: r.tramo, taxYear: 2026 } },
      update: { desdeEur: r.desdeEur, hastaEur: r.hastaEur, tipoEstatalPct: r.tipoEstatalPct, tipoCombinadoRefPct: r.tipoCombinadoRefPct, nota: F_ESTATAL_26, status: V },
      create: { id: uid(), tramo: r.tramo, desdeEur: r.desdeEur, hastaEur: r.hastaEur, tipoEstatalPct: r.tipoEstatalPct, tipoCombinadoRefPct: r.tipoCombinadoRefPct, taxYear: 2026, nota: F_ESTATAL_26, status: V },
    });
    c++;
  }

  // 3b. Escalas autonómicas 2026. PV, Navarra, C. Valenciana y Extremadura: verificadas ago-2026 contra fuentes primarias; resto: clon 2025 verificado (sin cambios normativos).
  const F_PV_26 = 'Art. 75 NF 13/2013 del IRPF (redacción NF 7/2025 Presupuestos THB), BOB · escala foral deflactada 2% para 2026, idéntica en Álava/Bizkaia/Gipuzkoa (NF 6/2025 Gipuzkoa; NF 21/2025 Álava) · verificado ago-2026: https://guiafiscal.es/irpf/tablas-irpf-bizkaia/';
  const PV_2026 = [
    [1, 0, 18080, 23], [2, 18080, 36160, 28], [3, 36160, 54240, 35], [4, 54240, 77450, 40],
    [5, 77450, 107260, 45], [6, 107260, 142960, 46], [7, 142960, 208390, 47], [8, 208390, null, 49],
  ];
  // Ley 5/2026 de 31-jul (DOGV 10425, art. 18): mismos umbrales, tipos rebajados, retroactiva 1-1-2026
  const F_CV_26 = 'Art. 2 Ley 13/1997 (redacción art. 18 Ley 5/2026, DOGV núm. 10425, 10-ago-2026), rebaja retroactiva desde 1-1-2026 · verificado ago-2026: https://guiafiscal.es/irpf/valencia/';
  const TIPOS_CV_26 = { 1: 8.8, 2: 11.7, 3: 14.6, 4: 17, 5: 19.4, 6: 21.9, 7: 24.4, 8: 26.1, 9: 27.35, 10: 28.35, 11: 29.35 };
  // DF 2.ª Ley 2/2026 de 3-agos (DOE 4-ago-2026): rebaja tramos 1-2 retroactiva 1-1-2026
  const F_EXT_26 = 'Art. 1 DLeg 1/2018 (redacción DF 2.ª Ley 2/2026, DOE 4-ago-2026), rebaja tramos 1-2 retroactiva desde 1-1-2026 · verificado ago-2026: https://guiafiscal.es/irpf/extremadura/';
  const TIPOS_EXT_26 = { 1: 7.75, 2: 9.75 };
  const autos25 = await prisma.irpfTramoAutonomico.findMany({ where: { taxYear: 2025 } });
  const porComunidad = new Map();
  for (const r of autos25) {
    if (!porComunidad.has(r.comunidad)) porComunidad.set(r.comunidad, []);
    porComunidad.get(r.comunidad).push(r);
  }
  for (const [comunidad, filas] of porComunidad) {
    if (TERRITORIOS_PV.includes(comunidad)) {
      for (const [tramo, desde, hasta, pct] of PV_2026) {
        await prisma.irpfTramoAutonomico.upsert({
          where: { comunidad_tramo_taxYear: { comunidad, tramo, taxYear: 2026 } },
          update: { desdeEur: desde, hastaEur: hasta, tipoAutonomicoPct: pct, notas: F_PV_26, status: V },
          create: { id: uid(), comunidad, jurisdictionId: filas[0].jurisdictionId, tramo, desdeEur: desde, hastaEur: hasta, tipoAutonomicoPct: pct, regimen: filas[0].regimen, taxYear: 2026, confianza: 'MEDIA', notas: F_PV_26, status: V },
        });
        c++;
      }
    } else {
      const navarra = comunidad.startsWith('Navarra');
      const fuenteNavarra = 'Art. 59 TRLIRPF Navarra (DF Legislativo 4/2008), escala fijada por Ley Foral 22/2023 con efectos 1-1-2024 y no modificada por LF 17/2025 · verificado ago-2026 contra tabla oficial vigente: https://taxdown.es/navarra-declaracion-renta/tramos-irpf-navarra-2026';
      const esCV = comunidad === 'Comunitat Valenciana';
      const esExt = comunidad === 'Extremadura';
      // Escalas sin cambios normativos en 2026, verificadas ago-2026 contra fuentes autonómicas
      const FUENTES_VERIFICADAS_26 = {
        'Madrid (Comunidad de)': 'Art. 8 DLeg 1/2010 (redacción Ley 13/2023, BOE-A-2024-5610); tarifa deflactada sin cambios en 2026 · verificado ago-2026',
        Cataluña: 'Art. 611-1 DLeg 1/2024 (redacción DL 5/2025, BOE-A-2025-10270); escala vigente 2025-2026 · verificado ago-2026',
        Aragón: 'Art. 110-1 DLeg 1/2005 (mod. Leyes 12/2023 y 4/2024); sin nueva deflactación para 2026 · verificado ago-2026',
        'Asturias (Principado de)': 'Ley 3/2025, de 19 de noviembre (BOPA 2-12-2025): rebaja 1er tramo al 9% y marginal al 26% · verificado ago-2026',
        Galicia: 'Art. 4 DLeg 1/2011; tarifa deflactada 2023 intacta en 2026 · verificado ago-2026',
        'Región de Murcia': 'DLeg 1/2010 (redacción Ley 11/2023, BORM); vigente desde 2024 · verificado ago-2026',
        'La Rioja': 'Ley 10/2017 (redacción Ley 13/2023, BOE-A-2024-1778); vigente desde 2024 · verificado ago-2026',
        Canarias: 'REF Ley 19/1994 (escala actualizada Ley 9/2025 BOC, deflactación 2,1%) · verificado ago-2026',
        Cantabria: 'DLeg 62/2008 (redacción Ley 3/2023); vigente 2024-2026 · verificado ago-2026',
        'Illes Balears': 'DLeg 1/2014 (redacción Ley 12/2023 PGIB); vigente 2024-2026 · verificado ago-2026',
        Andalucía: 'Art. 23 Ley 5/2021 (redacción DL 7/2022); umbrales 13.000/21.100 deflactados · verificado ago-2026',
        'Castilla y León': 'Art. 1 DLeg 1/2013; escala sin cambios 2024-2026 · verificado ago-2026',
        'Castilla-La Mancha': 'Art. 13 bis Ley 8/2013 (mod. Ley 3/2024); escala igual a la supletoria · verificado ago-2026',
        Ceuta: 'Arts. 65 y 74 LIRPF: escala supletoria idéntica a la estatal · deducción 50% art. 68.1 LIRPF · verificado ago-2026',
        Melilla: 'Arts. 65 y 74 LIRPF: escala supletoria idéntica a la estatal · deducción 50% art. 68.1 LIRPF · verificado ago-2026',
      };
      const fuenteVerificada = FUENTES_VERIFICADAS_26[comunidad] ?? null;
      for (const r of filas) {
        let updateExtra = {};
        let statusFila = U;
        let fuenteFila = r.fuenteTexto;
        if (navarra) {
          updateExtra = { status: V, fuenteTexto: fuenteNavarra };
          statusFila = V;
          fuenteFila = fuenteNavarra;
        } else if (esCV && TIPOS_CV_26[r.tramo] != null) {
          updateExtra = { tipoAutonomicoPct: TIPOS_CV_26[r.tramo], status: V, fuenteTexto: F_CV_26 };
          statusFila = V;
          fuenteFila = F_CV_26;
        } else if (esExt && TIPOS_EXT_26[r.tramo] != null) {
          updateExtra = { tipoAutonomicoPct: TIPOS_EXT_26[r.tramo], status: V, fuenteTexto: F_EXT_26 };
          statusFila = V;
          fuenteFila = F_EXT_26;
        } else if (fuenteVerificada) {
          updateExtra = { status: V, fuenteTexto: fuenteVerificada };
          statusFila = V;
          fuenteFila = fuenteVerificada;
        }
        await prisma.irpfTramoAutonomico.upsert({
          where: { comunidad_tramo_taxYear: { comunidad, tramo: r.tramo, taxYear: 2026 } },
          update: updateExtra,
          create: {
            id: uid(), comunidad, jurisdictionId: r.jurisdictionId, tramo: r.tramo,
            desdeEur: r.desdeEur, hastaEur: r.hastaEur,
            tipoAutonomicoPct: esCV ? (TIPOS_CV_26[r.tramo] ?? r.tipoAutonomicoPct) : esExt ? (TIPOS_EXT_26[r.tramo] ?? r.tipoAutonomicoPct) : r.tipoAutonomicoPct,
            regimen: r.regimen, taxYear: 2026,
            confianza: navarra || esCV || esExt || fuenteVerificada ? 'ALTA' : 'BAJA',
            notas: navarra ? 'Valores de la Ley Foral 22/2023 vigentes en 2026 (verificados ago-2026).' : navarra || esCV || esExt || fuenteVerificada ? 'Escala 2026 verificada ago-2026.' : NOTA_26,
            fuenteTexto: fuenteFila, status: statusFila,
          },
        });
        c++;
      }
    }
  }

  // 3c. Mínimos personales/familiares 2026: estatal verificado por estatuto (art. 56-57 LIRPF sin cambios), CCAA clon.
  const F_MIN_EST_26 = 'Arts. 56-57 LIRPF: importes del mínimo personal y familiar sin actualización desde 2019 · confirmado para 2026: https://guiafiscal.es/irpf/tramos-irpf-2026';
  const F_MIN_CCAA_26 = 'Valor idéntico a 2025 salvo actualización propia de la comunidad; sin fuente oficial 2026 al importar. Verificar con la publicación del ejercicio.';
  // Mínimo del contribuyente general 2026 confirmado ago-2026 (guiafiscal fichas CCAA)
  const MINIMO_GENERAL_26 = {
    Andalucía: 5790,
    'Asturias (Principado de)': 6105,
    Canarias: 5606,
    Cataluña: 5550,
    Ceuta: 5550,
    'Comunitat Valenciana': 6105,
    Galicia: 5789,
    'Illes Balears': 5550,
    'La Rioja': 5550,
    'Madrid (Comunidad de)': 5956.65,
    Melilla: 5550,
    'Castilla y León': 5550,
  };
  const mins25 = await prisma.minimoPersonalFamiliar.findMany({ where: { taxYear: 2025 } });
  for (const r of mins25) {
    const esEstatal = r.territorio === 'Estatal (referencia común)';
    const minVerificado = !esEstatal && r.concepto === 'Mínimo del contribuyente, general' ? MINIMO_GENERAL_26[r.territorio] : undefined;
    const statusFila = esEstatal || minVerificado != null ? V : U;
    const fuenteFila = esEstatal
      ? F_MIN_EST_26
      : minVerificado != null
        ? `Mínimo autonómico propio 2026 (${r.territorio}); art. 57 LIRPF y normativa cedida · verificado ago-2026`
        : F_MIN_CCAA_26;
    await prisma.minimoPersonalFamiliar.upsert({
      where: { territorio_concepto_taxYear: { territorio: r.territorio, concepto: r.concepto, taxYear: 2026 } },
      update: minVerificado != null && Number(r.importeEur) !== minVerificado ? { importeEur: minVerificado, status: statusFila, fuenteTexto: fuenteFila } : statusFila === V ? { status: statusFila, fuenteTexto: fuenteFila } : {},
      create: { id: uid(), territorio: r.territorio, concepto: r.concepto, importeEur: minVerificado ?? r.importeEur, notas: null, fuenteTexto: fuenteFila, taxYear: 2026, status: statusFila },
    });
    c++;
  }

  // 3d. Reducciones generales 2026 (saltar conceptos ya existentes en 2026)
  const F_RED_26 = 'Arts. 19-20, 32, 69-71 LIRPF (Ley 35/2006) — reducciones generales sin cambios para 2026 (sin norma modificadora publicada). Ley 5/2025 art. 14 y actualización 2026 ya reflejadas en valores del clon 2025.';
  const red26 = new Set((await prisma.reduccionGeneralIrpf.findMany({ where: { taxYear: 2026 } })).map((r) => r.concepto));
  for (const r of await prisma.reduccionGeneralIrpf.findMany({ where: { taxYear: 2025 } })) {
    if (red26.has(r.concepto)) continue;
    await prisma.reduccionGeneralIrpf.create({
      data: {
        id: uid(), concepto: r.concepto, importeEur: r.importeEur, formulaTexto: r.formulaTexto,
        condiciones: r.condiciones, notas: 'Clon 2025 verificado ago-2026: sin cambios normativos para 2026.',
        fuenteTexto: F_RED_26, taxYear: 2026, status: V,
      },
    });
    c++;
  }

  // 3e. Reglas IVA 2026 (tipos legales constantes, art. 90 LIVA)
  await prisma.vatRule.deleteMany({ where: { taxYear: 2026 } });
  for (const r of await prisma.vatRule.findMany({ where: { taxYear: 2025 } })) {
    await prisma.vatRule.create({
      data: {
        id: uid(), tipo: r.tipo, ratePct: r.ratePct, productCategory: r.productCategory,
        operationType: r.operationType, recipientType: r.recipientType, territory: r.territory,
        ejemplos: r.ejemplos, conditionsJson: r.conditionsJson ?? undefined,
        exceptionsJson: r.exceptionsJson ?? undefined, taxYear: 2026,
        effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo,
        sourceId: r.sourceId, status: V,
      },
    });
    c++;
  }

  // 3f. Escala patrimonio 2026 (art. 35-36 Ley 28/2006, constante desde 2022)
  const F_PAT_26 = 'Art. 35-36 Ley 28/2006 del Impuesto sobre el Patrimonio — escala estatal 2026 sin cambios desde 2022.';
  for (const r of await prisma.patrimonioEscala.findMany({ where: { taxYear: 2025 } })) {
    await prisma.patrimonioEscala.upsert({
      where: { tramo_territorio_taxYear: { tramo: r.tramo, territorio: r.territorio ?? 'Estatal', taxYear: 2026 } },
      update: { status: V },
      create: { id: uid(), tramo: r.tramo, desdeEur: r.desdeEur, hastaEur: r.hastaEur, tipoPct: r.tipoPct, territorio: r.territorio, taxYear: 2026, sourceId: r.sourceId, status: V },
    });
    c++;
  }
  console.log(`filas 2026 creadas/actualizadas: ${c}`);
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
