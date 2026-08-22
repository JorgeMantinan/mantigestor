/* eslint-disable no-console */
// Parte 2: IRPF estatal, RETA, Seguridad Social, IS (por años), calendario, Veri*FACTU, IVA, IRPF CCAA
const { readCsv, runImport, prisma, norm, slug, clean, num, numFromText, fechaLiteral, intOrNull, D } = require('./fiscal-lib');

module.exports = async function parte2(jurisByName) {
  await runIrpfEstatal();
  await runReta();
  await runSegSocial();
  await runIs();
  await runCalendario();
  await runVerifactu();
  await runIva();
  await runIrpfCcaa(jurisByName);
};

async function runIrpfEstatal() {
  await runImport('03_tramos_irpf_estatal', async db => {
    for (const r of readCsv('03_tramos_irpf_estatal')) {
      const id = `tramo-${r.tramo}-2025`;
      await db.put('irpfTramoEstatal', id, {
        id, tramo: intOrNull(r.tramo) ?? 0,
        desdeEur: D(num(r.desde_eur)), hastaEur: D(num(r.hasta_eur)),
        tipoEstatalPct: D(num(r.tipo_estatal_pct)), tipoCombinadoRefPct: D(num(r.tipo_referencia_combinado_pct)),
        taxYear: 2025, nota: clean(r.nota), status: 'OFFICIAL_UNVERIFIED',
      });
    }
  });
}

async function runReta() {
  await runImport('04_reta_autonomos_tramos', async db => {
    for (const r of readCsv('04_reta_autonomos_tramos')) {
      const year = intOrNull(r.tax_year) ?? 2026;
      const id = `${slug(r.tabla)}-${r.tramo}-${year}`;
      await db.put('retaTramo', id, {
        id, tabla: r.tabla, tramo: intOrNull(r.tramo) ?? 0,
        rendimientoNetoDesde: D(num(r.rendimiento_neto_mensual_desde_eur)),
        rendimientoNetoHasta: D(num(r.rendimiento_neto_mensual_hasta_eur)),
        baseMinimaEur: D(num(r.base_minima_eur)), baseMaximaEur: D(num(r.base_maxima_eur)),
        cuotaMinimaRefEur: D(num(r.cuota_minima_ref_31_5pct_eur)),
        confianza: clean(r.confianza_del_dato), fuenteTexto: clean(r.fuente), taxYear: year,
        status: clean(r.status) || 'OFFICIAL_UNVERIFIED', productionNote: clean(r.production_note),
      });
    }
  });
}

async function runSegSocial() {
  await runImport('05_cotizaciones_seg_social', async db => {
    for (const r of readCsv('05_cotizaciones_seg_social')) {
      const year = intOrNull(r.tax_year) ?? 2026;
      const id = `${slug(r.regimen)}-${slug(r.concepto)}-${year}`.slice(0, 100);
      await db.put('cotizacionSegSocial', id, {
        id, regimen: r.regimen, concepto: r.concepto,
        pctEmpresa: D(num(r.pct_empresa)), pctTrabajador: D(num(r.pct_trabajador)), pctTotal: D(num(r.pct_total)),
        baseReferencia: clean(r.base_de_referencia_2026), taxYear: year,
        status: clean(r.status) || 'OFFICIAL_UNVERIFIED', productionNote: clean(r.production_note),
      });
    }
  });
}

async function runIs() {
  await runImport('06_impuesto_sociedades_tipos', async db => {
    for (const r of readCsv('06_impuesto_sociedades_tipos')) {
      const cols = [['tipo_2025', 2025, false], ['tipo_2026', 2026, false],
        ['tipo_2027_previsto', 2027, true], ['tipo_2028_previsto', 2028, true], ['tipo_2029_previsto', 2029, true]];
      for (const [col, year, previsto] of cols) {
        const val = num(r[col]);
        if (val == null) continue;
        const id = `${slug(r.tipo_entidad)}-${year}`.slice(0, 100);
        await db.put('isTipo', id, {
          id, tipoEntidad: r.tipo_entidad, requisitoFacturacion: clean(r.requisito_facturacion),
          tipoPct: D(val), taxYear: year, previsto,
          notas: clean(r.notas),
          status: previsto ? 'RESEARCH' : (clean(r.status) || 'OFFICIAL_UNVERIFIED'),
          productionNote: previsto ? 'Previsión futura: no alimentar el motor fiscal hasta verificación oficial.' : clean(r.production_note),
        });
      }
    }
  });
}

async function runCalendario() {
  await runImport('07_calendario_fiscal', async db => {
    for (const r of readCsv('07_calendario_fiscal')) {
      const modMatch = String(r.modelo || '').match(/MOD\d+/i);
      const modeloNumero = modMatch ? modMatch[0].toUpperCase() : null;
      const periodType = /trimestral/i.test(r.periodo) ? 'TRIMESTRAL' : /mensual/i.test(r.periodo) ? 'MENSUAL' : /anual/i.test(r.periodo) ? 'ANUAL' : 'PUNTUAL';
      const year = intOrNull(r.tax_year) ?? 2026;
      const periodo = r.periodo;
      const id = `DL-${slug(modeloNumero || r.modelo)}-${slug(periodo)}`.slice(0, 100);
      await db.put('deadline', id, {
        id, modeloNumero, periodo, periodType,
        deadlineType: clean(r.deadline_type) || 'FECHA_FIJA',
        deadlineRule: 'FECHA_FIJA_REFERENCIA',
        deadlineRuleJson: { tipo: 'FECHA_FIJA', nota: 'Fecha concreta del CSV como referencia; requiere regla dinámica antes de producción' },
        fechaLimiteReferencia: fechaLiteral(r.fecha_limite_2026, year),
        diasAvisoRecomendados: clean(r.dias_aviso_recomendados),
        aplicaA: clean(r.aplica_a), taxYear: year,
        status: clean(r.status) || 'OFFICIAL_UNVERIFIED',
        productionNote: clean(r.production_note),
      });
    }
  });
}

async function runVerifactu() {
  await runImport('09_verifactu_facturacion_electronica', async db => {
    for (const r of readCsv('09_verifactu_facturacion_electronica')) {
      const fecha = fechaLiteral(r.fecha_o_valor, null);
      const year = fecha ? fecha.getUTCFullYear() : 2026; // Deadline.taxYear es NOT NULL; contexto RD-ley 15/2025
      const id = `DL-VERIFACTU-${slug(r.concepto)}`.slice(0, 100);
      await db.put('deadline', id, {
        id, modeloNumero: 'VERIFACTU', periodo: r.concepto, periodType: 'PUNTUAL',
        deadlineType: 'FECHA_FIJA', deadlineRule: 'FECHA_FIJA',
        deadlineRuleJson: { tipo: 'FECHA_FIJA', fuente: 'RD-ley 15/2025' },
        fechaLimiteReferencia: fecha, aplicaA: clean(r.aplica_a), taxYear: year,
        status: 'OFFICIAL_UNVERIFIED', productionNote: clean(r.fuente),
      });
    }
  });
}

async function runIva() {
  await runImport('08_iva_tipos', async db => {
    for (const r of readCsv('08_iva_tipos')) {
      const id = `IVA-${slug(r.tipo)}-2025`.slice(0, 100);
      await db.put('vatRule', id, {
        id, tipo: r.tipo, ratePct: D(num(r.porcentaje)),
        productCategory: clean(r.categoria), territory: 'ES-TC', taxYear: 2025,
        ejemplos: clean(r.ejemplos), status: 'OFFICIAL_UNVERIFIED',
      });
    }
  });
}

// CSV10 da régimen/confianza/notas por CCAA (resumen); CSV11 trae los tramos reales.
async function runIrpfCcaa(jurisByName) {
  const resumen = readCsv('10_irpf_por_comunidad_autonoma');
  const porComunidad = new Map(resumen.map(r => [norm(String(r.comunidad_autonoma).replace(/\s*\(.*\)\s*/, '')), r]));

  function regimenDe(comunidad) {
    if (/alava/.test(comunidad)) return 'Foral Álava';
    if (/bizkaia/.test(comunidad)) return 'Foral Bizkaia';
    if (/gipuzkoa|guipuzcoa/.test(comunidad)) return 'Foral Gipuzkoa';
    if (/navarra/.test(comunidad)) return 'Navarra';
    return 'Común';
  }

  function jurisIdDe(comunidad) {
    const c = norm(comunidad.replace(/\s*\(.*\)\s*/, ''));
    if (jurisByName.has(c)) return jurisByName.get(c);
    for (const [k, v] of jurisByName) { if (k.startsWith(c.slice(0, 6)) || c.startsWith(k.slice(0, 6))) return v; }
    return null;
  }

  await runImport('11_irpf_ccaa_tramos_detalle', async db => {
    for (const r of readCsv('11_irpf_ccaa_tramos_detalle')) {
      const comunidad = r.comunidad_autonoma;
      const meta = porComunidad.get(norm(comunidad.replace(/\s*\(.*\)\s*/, ''))) || {};
      const id = `${slug(comunidad)}-${r.tramo_num}-2025`.slice(0, 100);
      await db.put('irpfTramoAutonomico', id, {
        id, comunidad, jurisdictionId: jurisIdDe(comunidad),
        tramo: intOrNull(r.tramo_num) ?? 0,
        desdeEur: D(num(r.desde_eur)), hastaEur: D(num(r.hasta_eur)),
        tipoAutonomicoPct: D(num(r.tipo_autonomico_pct)),
        regimen: regimenDe(comunidad), taxYear: 2025,
        confianza: clean(meta.confianza_del_dato), notas: clean(meta.notas), fuenteTexto: clean(r.fuente || meta.fuente),
        status: 'OFFICIAL_UNVERIFIED',
      });
    }
  });

  // Resumen CSV10: guardar como fila tramo=0 con totales en notas (referencia de escala completa)
  await runImport('10_irpf_por_comunidad_autonoma', async db => {
    for (const r of resumen) {
      const comunidad = r.comunidad_autonoma;
      const id = `${slug(comunidad)}-resumen-2025`.slice(0, 100);
      await db.put('irpfTramoAutonomico', id, {
        id, comunidad, jurisdictionId: jurisIdDe(comunidad), tramo: 0,
        desdeEur: '0', hastaEur: null,
        tipoAutonomicoPct: D(num(r.tipo_max_autonomico)),
        regimen: regimenDe(comunidad), taxYear: 2025,
        confianza: clean(r.confianza_del_dato),
        notas: `RESUMEN escala ${clean(r.num_tramos_autonomicos)} tramos | tipo min ${clean(r.tipo_min_autonomico)} max ${clean(r.tipo_max_autonomico)} | ${clean(r.notas)}`,
        fuenteTexto: clean(r.fuente), status: 'OFFICIAL_UNVERIFIED',
      });
    }
  });
}
