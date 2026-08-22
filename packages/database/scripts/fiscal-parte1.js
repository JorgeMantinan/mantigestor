/* eslint-disable no-console */
// Parte 1: fuentes, jurisdicciones, administraciones, estados, auditoría, modelos, porcentajes
const { readCsv, norm, clean, num, dateOrNull, boolSi, intOrNull, D } = require('./fiscal-lib');

module.exports = async function parte1() {
  await runFuentes();
  await runJurisdicciones();
  await runAdministraciones();
  await runEstados();
  await runAuditoria();
  await runModelos();
  await runPorcentajes();
};

async function runFuentes() {
  const { runImport } = require('./fiscal-lib');
  await runImport('21_fuentes_oficiales', async db => {
    for (const r of readCsv('21_fuentes_oficiales')) {
      const data = {
        id: r.source_id, authority: r.authority, title: r.title, sourceType: r.source_type,
        url: clean(r.url), effectiveFrom: dateOrNull(r.effective_from), effectiveTo: dateOrNull(r.effective_to),
        verificationStatus: 'OFFICIAL_UNVERIFIED', notes: clean(r.notes),
      };
      await db.put('fiscalSource', r.source_id, data);
    }
  });
}

async function runJurisdicciones() {
  const { runImport } = require('./fiscal-lib');
  await runImport('22_jurisdicciones', async db => {
    for (const r of readCsv('22_jurisdicciones')) {
      await db.put('jurisdiction', r.jurisdiction_id, {
        id: r.jurisdiction_id, name: r.name, type: r.type,
        country: clean(r.country) || 'España', active: boolSi(r.active),
      });
    }
  });
}

async function runAdministraciones() {
  const { runImport, prisma } = require('./fiscal-lib');
  await runImport('23_administraciones', async db => {
    for (const r of readCsv('23_administraciones')) {
      const j = await prisma.jurisdiction.findUnique({ where: { id: r.jurisdiction_id } }).catch(() => null);
      if (!j) throw new Error(`jurisdicción inexistente: ${r.jurisdiction_id}`);
      await db.put('administration', r.administration_id, {
        id: r.administration_id, name: r.name, type: r.type, jurisdictionId: r.jurisdiction_id,
      });
    }
  });
}

async function runEstados() {
  const { runImport } = require('./fiscal-lib');
  await runImport('24_estados_verificacion', async db => {
    for (const r of readCsv('24_estados_verificacion')) {
      // PK del modelo es `status`, no `id`
      await db.put('estadoVerificacion', r.status, {
        status: r.status, productionAllowed: boolSi(r.production_allowed), definition: clean(r.definition) || '',
      }, 'status');
    }
  });
}

async function runAuditoria() {
  const { runImport } = require('./fiscal-lib');
  await runImport('25_auditoria_correcciones', async db => {
    for (const r of readCsv('25_auditoria_correcciones')) {
      await db.put('auditoriaCorreccion', r.id, {
        id: r.id, archivo: clean(r.sheet), hoja: clean(r.target), campo: clean(r.type),
        valorOriginal: clean(r.original_issue), valorCorregido: clean(r.required_change),
        nuevoEstado: clean(r.new_status), reemplazo: clean(r.replacement),
        fecha: dateOrNull(r.effective_to), sourceId: clean(r.source_id),
      });
    }
  });
}

async function runModelos() {
  const { runImport, prisma } = require('./fiscal-lib');
  await runImport('01_modelos_y_obligaciones', async db => {
    for (const r of readCsv('01_modelos_y_obligaciones')) {
      const url = clean(r.url_oficial);
      const urlFinal = url && !/^http/i.test(url) ? `https://${url}` : url;
      if (clean(r.source_id)) {
        const src = await prisma.fiscalSource.findUnique({ where: { id: r.source_id } }).catch(() => null);
        if (!src) throw new Error(`fuente inexistente: ${r.source_id}`);
      }
      const data = {
        id: r.id_modelo, modelNumber: r.id_modelo, nombreOficial: r.nombre_oficial,
        categoria: r.categoria, organismo: r.organismo,
        administrationId: norm(r.organismo) === 'aeat' ? 'ADM_AEAT' : null,
        aplicaAutonomo: boolSi(r.aplica_autonomo), aplicaPymeSl: boolSi(r.aplica_pyme_sl),
        aplicaEmpresaGrande: boolSi(r.aplica_empresa_grande),
        periodicidad: clean(r.periodicidad), plazoPresentacion: clean(r.plazo_presentacion),
        umbralObligacion: clean(r.umbral_obligatoriedad), descripcionBreve: clean(r.descripcion_breve),
        urlOficial: urlFinal,
        taxYear: intOrNull(r.tax_year), applicationYear: intOrNull(r.tax_year),
        effectiveFrom: dateOrNull(r.effective_from), effectiveTo: dateOrNull(r.effective_to),
        version: intOrNull(r.version) || 1,
        status: clean(r.status) || 'OFFICIAL_UNVERIFIED',
        replacementModel: clean(r.replacement_model), sourceId: clean(r.source_id),
        productionEligible: boolSi(r.production_eligible) || norm(clean(r.status)) === 'official_verified',
        verificationNotes: clean(r.verification_notes),
      };
      await db.put('taxModel', r.id_modelo, data);
    }
  });
}

async function runPorcentajes() {
  const { runImport } = require('./fiscal-lib');
  await runImport('02_porcentajes_y_tipos', async db => {
    for (const r of readCsv('02_porcentajes_y_tipos')) {
      const valor = num(r.valor);
      if (valor == null) { await db.warn(r.id, `valor no numérico (${JSON.stringify(clean(r.valor))}) y FiscalRate.valor es Decimal NOT NULL`); continue; }
      const u = clean(r.fuente_url);
      await db.put('fiscalRate', r.id, {
        id: r.id, modeloRelacionado: clean(r.id_modelo_relacionado), concepto: r.concepto,
        valor: D(valor), baseCalculo: clean(r.base_de_calculo), condicionAplicacion: clean(r.condicion_aplicacion),
        vigenteDesde: intOrNull(r.vigente_desde), notes: clean(r.notas_verificacion),
        fuenteUrl: u && !/^http/i.test(u) ? `https://${u}` : u,
      });
    }
  });
}
