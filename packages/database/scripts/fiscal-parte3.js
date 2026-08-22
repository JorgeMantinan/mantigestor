/* eslint-disable no-console */
// Parte 3: mínimos, reducciones, ISD, ITP/AJD, amortización, umbrales, sanciones, patrimonio, reglas territoriales
const { readCsv, runImport, norm, slug, clean, num, numFromText, intOrNull, D } = require('./fiscal-lib');

module.exports = async function parte3() {
  await runMinimos();
  await runReducciones();
  await runIsd();
  await runItpAjd();
  await runAmortizacion();
  await runUmbrales();
  await runSancionesRecargos();
  await runSancionesLgt();
  await runPatrimonio();
  await runReglasTerritoriales();
};

async function runMinimos() {
  await runImport('12_minimo_personal_familiar', async db => {
    for (const r of readCsv('12_minimo_personal_familiar')) {
      const importe = numFromText(r.importe_eur);
      if (importe == null) { await db.warn(`${r.territorio}/${r.concepto}`, `importe no numérico (${JSON.stringify(clean(r.importe_eur))}) y MinimoPersonalFamiliar.importeEur es Decimal NOT NULL`); continue; }
      const id = `${slug(r.territorio)}-${slug(r.concepto)}-2025`.slice(0, 100);
      await db.put('minimoPersonalFamiliar', id, {
        id, territorio: r.territorio, concepto: r.concepto,
        importeEur: D(importe),
        notas: clean(r.notas), fuenteTexto: clean(r.fuente), taxYear: 2025, status: 'OFFICIAL_UNVERIFIED',
      });
    }
  });
}

async function runReducciones() {
  await runImport('13_reducciones_generales_irpf', async db => {
    let i = 0;
    for (const r of readCsv('13_reducciones_generales_irpf')) {
      i++;
      const id = `${slug(r.concepto)}-${slug(String(r.condicion_o_tramo).slice(0, 30))}-${i}`.slice(0, 100);
      await db.put('reduccionGeneralIrpf', id, {
        id, concepto: r.concepto,
        formulaTexto: clean(r.importe_o_formula), importeEur: D(numFromText(r.importe_o_formula)),
        condiciones: clean(r.condicion_o_tramo), notas: clean(r.notas), fuenteTexto: clean(r.fuente),
        taxYear: 2025, status: 'OFFICIAL_UNVERIFIED',
      });
    }
  });
}

async function runIsd() {
  await runImport('14_sucesiones_donaciones', async db => {
    for (const r of readCsv('14_sucesiones_donaciones')) {
      const id = `ISD-${slug(`${r.concepto} ${r.territorio_o_grupo || ''}`)}`.slice(0, 100);
      const concepto = norm(r.concepto);
      const tipoOperacion = /sucesion/.test(concepto) ? 'SUCESION'
        : /donacion/.test(concepto) && /inmueble/.test(norm(r.valor || '')) ? 'DONACION_INMUEBLE'
        : /donacion/.test(concepto) ? 'DONACION' : /seguro/.test(concepto) ? 'SEGURO_VIDA' : null;
      await db.put('isdRegla', id, {
        id, concepto: r.concepto, territorioGrupo: clean(r.territorio_o_grupo),
        valor: clean(r.valor), tipoOperacion,
        notas: clean(r.notas), fuenteTexto: clean(r.fuente), confianza: clean(r.confianza),
        sourceClass: clean(r.source_class), productionNote: clean(r.action_required),
        status: clean(r.production_status) || 'OFFICIAL_UNVERIFIED',
      });
    }
  });
}

async function runItpAjd() {
  await runImport('15_itp_ajd_patrimonio_itsgf', async db => {
    for (const r of readCsv('15_itp_ajd_patrimonio_itsgf')) {
      const imp = String(r.impuesto || '').toUpperCase();
      const impuesto = imp.startsWith('ITP') ? 'ITP' : imp.startsWith('AJD') ? 'AJD' : imp.startsWith('IP') ? 'IP' : imp.startsWith('ITS') ? 'ITSGF' : imp || 'OTRO';
      const cNorm = norm(r.concepto);
      const operationType = /inmueble/.test(cNorm) ? 'INMUEBLE' : /vehicul/.test(cNorm) ? 'VEHICULO' : /arrendamiento/.test(cNorm) ? 'ARRENDAMIENTO' : null;
      const id = `${impuesto}-${slug(r.concepto)}`.slice(0, 100);
      await db.put('itpAjdRegla', id, {
        id, impuesto, concepto: r.concepto, valor: clean(r.valor),
        operationType, notas: clean(r.notas), fuenteTexto: clean(r.fuente), confianza: clean(r.confianza),
        sourceClass: clean(r.source_class), productionNote: clean(r.action_required),
        status: clean(r.production_status) || 'OFFICIAL_UNVERIFIED',
      });
    }
  });
}

async function runAmortizacion() {
  await runImport('16_amortizacion_dietas_km', async db => {
    for (const r of readCsv('16_amortizacion_dietas_km')) {
      const id = `${slug(r.categoria)}-${slug(r.concepto)}`.slice(0, 100);
      const valorTxt = clean(r.valor);
      await db.put('amortizacionDietaKm', id, {
        id, categoria: r.categoria, concepto: r.concepto,
        valorTexto: valorTxt, valor: D(numFromText(valorTxt)),
        unidad: /%/.test(valorTxt || '') ? '% anual' : /km/i.test(valorTxt || '') ? 'EUR/km' : null,
        notas: [clean(r.notas), clean(r.confianza)].filter(Boolean).join(' | ') || null,
        fuenteTexto: clean(r.fuente),
        status: /fetch directo|fuente primaria/i.test(clean(r.confianza) || '') ? 'OFFICIAL_UNVERIFIED' : 'SECONDARY_SOURCE',
      });
    }
  });
}

async function runUmbrales() {
  await runImport('17_umbrales_tamano_empresa', async db => {
    for (const r of readCsv('17_umbrales_tamano_empresa')) {
      const empleadosNum = numFromText(r.empleados);
      const factNum = numFromText(r.facturacion_o_balance);
      const id = `${slug(r.sistema)}-${slug(r.categoria)}`.slice(0, 100);
      await db.put('umbralTamanoEmpresa', id, {
        id, sistema: r.sistema, criterio: r.categoria,
        umbralValor: D(empleadosNum ?? factNum),
        umbralUnidad: empleadosNum != null ? 'empleados' : factNum != null ? 'EUR' : null,
        baseLegal: clean(r.fuente),
        notas: `Empleados: ${clean(r.empleados)} | Fact./balance: ${clean(r.facturacion_o_balance)} | ${clean(r.para_que_sirve)}`,
        status: /no se ha hecho fetch|secundaria/i.test(clean(r.confianza) || '') ? 'SECONDARY_SOURCE' : 'OFFICIAL_UNVERIFIED',
      });
    }
  });
}

async function runSancionesRecargos() {
  await runImport('18_sanciones_recargos_aplazamientos', async db => {
    let i = 0;
    for (const r of readCsv('18_sanciones_recargos_aplazamientos')) {
      i++;
      const id = `SANC-RGR-${slug(r.concepto).slice(0, 70)}-${i}`.slice(0, 100);
      await db.put('sancion', id, {
        id, norma: 'LGT/RGR', tipoInfraccion: r.concepto,
        sancionFija: clean(r.valor),
        notas: [clean(r.condicion), clean(r.notas)].filter(Boolean).join(' | ') || null,
        fuenteTexto: clean(r.fuente),
        sourceClass: clean(r.source_class),
        status: clean(r.production_status) || 'SECONDARY_SOURCE',
      });
    }
  });
}

async function runSancionesLgt() {
  await runImport('19_sanciones_lgt_detalle', async db => {
    for (const r of readCsv('19_sanciones_lgt_detalle')) {
      const calif = norm(r.calificacion);
      const gravedad = /muy grave/.test(calif) ? 'MUY_GRAVE' : /grave/.test(calif) ? 'GRAVE' : /leve/.test(calif) ? 'LEVE' : null;
      const id = `SANC-LGT-${slug(r.articulo_lgt)}-${slug(String(r.infraccion).slice(0, 40))}`.slice(0, 100);
      await db.put('sancion', id, {
        id, norma: 'LGT', articulo: clean(r.articulo_lgt), tipoInfraccion: r.infraccion,
        gravedad, sancionFija: clean(r.sancion),
        notas: clean(r.notas), fuenteTexto: clean(r.fuente),
        sourceClass: clean(r.source_class),
        status: clean(r.production_status) || 'SECONDARY_SOURCE',
      });
    }
  });
}

async function runPatrimonio() {
  await runImport('20_patrimonio_escala_estatal', async db => {
    for (const r of readCsv('20_patrimonio_escala_estatal')) {
      const id = `${r.tramo}-Estatal-2025`;
      await db.put('patrimonioEscala', id, {
        id, tramo: intOrNull(r.tramo) ?? 0,
        desdeEur: D(num(r.desde_eur)), hastaEur: D(num(r.hasta_eur)), tipoPct: D(num(r.tipo_pct)),
        territorio: 'Estatal', taxYear: 2025, status: 'OFFICIAL_UNVERIFIED',
      });
    }
  });
}

async function runReglasTerritoriales() {
  await runImport('26_reglas_territoriales', async db => {
    for (const r of readCsv('26_reglas_territoriales')) {
      const scope = norm(r.scope);
      const jurisdictionId = /territorio_comun/.test(scope) ? 'ES-TC' : null;
      await db.put('reglaTerritorial', r.rule_id, {
        id: r.rule_id, tax: r.tax, scope: r.scope, caseType: clean(r.case_type), rule: r.rule,
        jurisdictionId, sourceId: clean(r.source_id),
        status: clean(r.status) || 'OFFICIAL_UNVERIFIED',
      });
    }
  });
}
