/* eslint-disable no-console */
// Orquestador del importador del dataset fiscal España.
// Uso: node packages/database/scripts/import-fiscal.js
const { prisma, norm, runImport, resumen } = require('./fiscal-lib');
const parte1 = require('./fiscal-parte1');
const parte2 = require('./fiscal-parte2');
const parte3 = require('./fiscal-parte3');

(async () => {
  console.log('=== IMPORTACIÓN DATASET FISCAL ESPAÑA ===\n');

  await parte1();

  // Mapa nombre normalizado → jurisdictionId para IRPF CCAA
  const juris = await prisma.jurisdiction.findMany();
  const jurisByName = new Map(juris.map(j => [norm(j.name), j.id]));

  await parte2(jurisByName);
  await parte3();

  await resumen();
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
