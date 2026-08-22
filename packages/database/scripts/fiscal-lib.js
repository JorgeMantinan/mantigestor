/* eslint-disable no-console */
// Librería compartida del importador fiscal (parser CSV, helpers, runner con log de auditoría)
const fs = require('fs');
const path = require('path');

for (const line of fs.readFileSync(path.join(__dirname, '..', '..', '..', '.env.local'), 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=([^\r\n]*)/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CSV_DIR = path.join(__dirname, '..', 'data', 'csv_bbdd_importables_CORREGIDOS', 'csv_bbdd');

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter(r => r.some(f => f && f.trim()))
    .map(r => {
      const o = {};
      header.forEach((h, i) => { o[(h || '').trim()] = r[i] != null ? r[i].trim() : ''; });
      return o;
    });
}

const readCsv = name => parseCsv(fs.readFileSync(path.join(CSV_DIR, name.endsWith('.csv') ? name : `${name}.csv`), 'utf8'));

const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const clean = s => { const t = String(s ?? '').trim(); return !t || t === '-' ? null : t; };

function num(v) {
  if (v == null) return null;
  let s = String(v).trim();
  if (!s || s === '-' || /sin l/i.test(s)) return null;
  s = s.replace(/[%\u20ac\u00a0\s]/g, '');
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function numFromText(t) {
  const m = String(t ?? '').match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+|\d+(?:\.\d+)?/);
  if (!m) return null;
  let s = m[0];
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d+,\d+$/.test(s)) s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

const dateOrNull = v => { const s = clean(v); return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(`${s.slice(0, 10)}T00:00:00Z`) : null; };

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function fechaLiteral(v, yearDefault) {
  if (!clean(v)) return null;
  const s = norm(v);
  const mY = s.match(/(\d{4})/);
  const year = mY ? +mY[1] : yearDefault;
  const mD = s.match(/(\d{1,2})\s+de\s+([a-z]+)/);
  const mes = mD ? MESES.indexOf(mD[2]) : -1;
  if (!mD || mes < 0) return dateOrNull(v);
  return new Date(Date.UTC(year, mes, +mD[1]));
}

const boolSi = v => /^s/i.test(norm(String(v ?? '')));
const intOrNull = v => { const n = num(v); return n == null ? null : Math.round(n); };
const D = n => (n == null ? null : String(n));

// Runner: crea ImportRun, ejecuta fn(db), registra rechazados en DataQualityError.
async function runImport(file, fn) {
  const run = await prisma.importRun.create({ data: { file } });
  const c = { runId: run.id, file, inserted: 0, updated: 0, rejected: 0 };
  const db = {
    async put(model, id, data, idField = 'id') {
      try {
        const existing = await prisma[model].findUnique({ where: { [idField]: id } });
        if (existing) { await prisma[model].update({ where: { [idField]: id }, data }); c.updated++; }
        else { await prisma[model].create({ data }); c.inserted++; }
      } catch (e) {
        c.rejected++;
        console.error(`    ERROR ${model}[${id}] ${e.code || ''}: ${resumenError(e)}`);
        await prisma.dataQualityError.create({
          data: { runId: c.runId, sourceFile: file, errorCode: e.code || 'IMPORT_ERROR', message: resumenError(e, 500), value: String(id).slice(0, 200), severity: 'ERROR' },
        }).catch(() => {});
      }
    },
    // Upsert por clave única compuesta (p.ej. @@unique([concepto, taxYear]))
    async putBy(model, uniqueWhere, data) {
      try {
        const existing = await prisma[model].findFirst({ where: uniqueWhere });
        if (existing) { await prisma[model].update({ where: { id: existing.id }, data }); c.updated++; }
        else { await prisma[model].create({ data: { ...uniqueWhere, ...data } }); c.inserted++; }
      } catch (e) {
        c.rejected++;
        console.error(`    ERROR ${model}[${JSON.stringify(uniqueWhere)}] ${e.code || ''}: ${resumenError(e)}`);
        await prisma.dataQualityError.create({
          data: { runId: c.runId, sourceFile: file, errorCode: e.code || 'IMPORT_ERROR', message: resumenError(e, 500), value: JSON.stringify(uniqueWhere).slice(0, 200), severity: 'ERROR' },
        }).catch(() => {});
      }
    },
    // Fila del dataset que no cabe en el modelo: se registra como aviso, no como fallo técnico
    async warn(value, message) {
      c.rejected++;
      console.warn(`    AVISO (fila omitida) ${value}: ${message}`);
      await prisma.dataQualityError.create({
        data: { runId: c.runId, sourceFile: file, errorCode: 'SKIPPED_INVALID_DATA', message: String(message).slice(0, 500), value: String(value).slice(0, 200), severity: 'WARNING' },
      }).catch(() => {});
    },
  };
  await fn(db, c);
  await prisma.importRun.update({
    where: { id: run.id },
    data: { rowsRead: c.inserted + c.updated + c.rejected, rowsInserted: c.inserted, rowsUpdated: c.updated, rowsRejected: c.rejected, finishedAt: new Date() },
  }).catch(() => {});
  console.log(`  ${file}: +${c.inserted} nuevos, ~${c.updated} actualizados, !${c.rejected} rechazados`);
}

function resumenError(e, max = 180) {
  const lineas = String(e.message || '').split('\n');
  const util = lineas.filter(l => /Argument|Invalid value|Unique constraint|Foreign key|required/i.test(l)).join(' | ');
  return ((util || lineas[lineas.length - 1] || '').replace(/\s+/g, ' ').trim()).slice(0, max) || e.code || 'sin detalle';
}

async function resumen() {
  const tablas = ['fiscalSource', 'jurisdiction', 'administration', 'estadoVerificacion', 'auditoriaCorreccion', 'taxModel', 'fiscalRate', 'irpfTramoEstatal', 'irpfTramoAutonomico', 'retaTramo', 'cotizacionSegSocial', 'isTipo', 'deadline', 'vatRule', 'minimoPersonalFamiliar', 'reduccionGeneralIrpf', 'isdRegla', 'itpAjdRegla', 'patrimonioEscala', 'sancion', 'amortizacionDietaKm', 'umbralTamanoEmpresa', 'reglaTerritorial'];
  console.log('\n=== RESUMEN ===');
  for (const t of tablas) {
    const n = await prisma[t].count();
    if (n > 0) console.log(`  ${t}: ${n}`);
  }
  const err = await prisma.dataQualityError.count({ where: { resolved: false } });
  console.log(`  data_quality_errors sin resolver: ${err}`);
}

module.exports = { prisma, readCsv, norm, slug, clean, num, numFromText, dateOrNull, fechaLiteral, boolSi, intOrNull, D, runImport, resumen };
