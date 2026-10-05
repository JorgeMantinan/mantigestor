// Fix schema: add missing sourceId relations + repair mojibake in comments
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let c = fs.readFileSync(p, 'utf8');

// Repair double-encoded UTF8 (read as latin1 then written as utf8)
const map = {
  '\u00C3\u00B1': 'ñ', // ñ
  '\u00C3\u00B3': 'ó', // ó
  '\u00C3\u00A9': 'é', // é
  '\u00C3\u00AD': 'í', // í
  '\u00C3\u00BA': 'ú', // ú
  '\u00C3\u00A1': 'á', // á
  '\u00C3\u0093': 'Ó',
  '\u00C3\u0089': 'É',
  '\u00C3\u008D': 'Í',
  '\u00C3\u009A': 'Ú',
  '\u00C3\u0081': 'Á',
};
for (const [k, v] of Object.entries(map)) c = c.split(k).join(v);

const rel = (indent) => `${indent}sourceId${' '.repeat(10)}String?\n${indent}source${' '.repeat(11)}FiscalSource? @relation(fields: [sourceId], references: [id])`;

// RetaTramo: add sourceId before @@unique
c = c.replace(
  /(model RetaTramo \{[\s\S]*?)(\n\s*@@unique\(\[tabla, tramo, taxYear\]\))/,
  `$1\n  fuenteTexto           String?\n${rel('  ')}$2`
);
// CotizacionSegSocial
c = c.replace(
  /(model CotizacionSegSocial \{[\s\S]*?)(\n\s*@@unique\(\[regimen, concepto, taxYear\]\))/,
  `$1\n  baseReferencia    String?\n${rel('  ')}$2`
);
// IsTipo
c = c.replace(
  /(model IsTipo \{[\s\S]*?)(\n\s*@@unique\(\[tipoEntidad, taxYear\]\))/,
  `$1\n  notas              String?\n${rel('  ')}$2`
);

fs.writeFileSync(p, c, 'utf8');
console.log('schema fixed');
