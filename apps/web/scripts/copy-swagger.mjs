// Copia los assets de swagger-ui-dist a public/swagger (auto-hospedado).
// Se ejecuta en postinstall para que la copia nunca quede desactualizada
// cuando se actualice la dependencia (si no existe, no rompe la instalación).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const origen = path.join(aqui, '..', 'node_modules', 'swagger-ui-dist')
const destino = path.join(aqui, '..', 'public', 'swagger')

const ficheros = ['swagger-ui-bundle.js', 'swagger-ui.css', 'swagger-ui-bundle.js.LICENSE.txt']

if (!fs.existsSync(origen)) {
  console.warn('[copy-swagger] swagger-ui-dist no instalado; se omite la copia')
  process.exit(0)
}

fs.mkdirSync(destino, { recursive: true })
for (const f of ficheros) {
  const de = path.join(origen, f)
  if (fs.existsSync(de)) {
    fs.copyFileSync(de, path.join(destino, f))
    console.log(`[copy-swagger] ${f} → public/swagger/`)
  }
}
