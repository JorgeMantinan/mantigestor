// Verifica que las tablas fiscales existen en Supabase
const fs = require('fs');
const path = require('path');

for (const line of fs.readFileSync(path.join(__dirname, '..', '..', '..', '.env.local'), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLAS = [
  'fiscal_sources', 'jurisdicciones', 'administraciones', 'estados_verificacion',
  'auditoria_correcciones', 'tax_models', 'fiscal_rates', 'irpf_tramos_estatales',
  'irpf_tramos_autonomicos', 'reta_tramos', 'cotizaciones_seg_social', 'is_tipos',
  'deadlines', 'vat_rules', 'minimo_personal_familiar', 'reducciones_generales_irpf',
  'isd_reglas', 'itp_ajd_reglas', 'patrimonio_escala_estatal', 'sanciones',
  'amortizacion_dietas_km', 'umbrales_tamano_empresa', 'reglas_territoriales',
  'import_log', 'data_quality_errors',
];
// estados_verificacion usa status como PK
const COL_POR_TABLA = { estados_verificacion: 'status' };

(async () => {
  let faltan = 0;
  for (const t of TABLAS) {
    const res = await fetch(`${url}/rest/v1/${t}?select=${COL_POR_TABLA[t] ?? 'id'}&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (res.ok) console.log(`OK      ${t}`);
    else { console.log(`FALTA   ${t} (${res.status})`); faltan++; }
  }
  console.log(faltan === 0 ? '\nTodas las tablas existen' : `\n${faltan} tablas faltan`);
})();
