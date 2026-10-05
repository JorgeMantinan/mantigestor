import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { swaggerSpec } from '@/lib/openapi'

const API_DIR = path.resolve(__dirname, '../app/api')

function recorrer(directorio: string): string[] {
  const salida: string[] = []
  for (const e of fs.readdirSync(directorio, { withFileTypes: true })) {
    const p = path.join(directorio, e.name)
    if (e.isDirectory()) salida.push(...recorrer(p))
    else if (e.name === 'route.ts') salida.push(p)
  }
  return salida
}

function rutaSpec(desdeArchivo: string): string {
  const rel = path.relative(API_DIR, path.dirname(desdeArchivo)).replace(/\\/g, '/')
  return '/api/' + rel.replace(/\[([^\]]+)\]/g, '{$1}')
}

const rutasReales = recorrer(API_DIR).map((archivo) => {
  const src = fs.readFileSync(archivo, 'utf8')
  const metodos = [...src.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => String(m[1]).toLowerCase())
  return { ruta: rutaSpec(archivo), metodos }
})

describe('spec OpenAPI sincronizado con app/api', () => {
  it('todas las rutas reales existen en el spec', () => {
    const faltantes: string[] = []
    for (const { ruta, metodos } of rutasReales) {
      const enSpec = (swaggerSpec.paths as Record<string, Record<string, unknown>>)[ruta]
      if (!enSpec) {
        faltantes.push(`${ruta} (falta la ruta entera)`)
        continue
      }
      for (const m of metodos) {
        if (!enSpec[m]) faltantes.push(`${ruta} ${m.toUpperCase()}`)
      }
    }
    expect(faltantes).toEqual([])
  })

  it('el spec no contiene rutas fantasma (que no existan en el código)', () => {
    const reales = new Set(rutasReales.map((r) => r.ruta))
    const fantasma = Object.keys(swaggerSpec.paths).filter((p) => !reales.has(p))
    expect(fantasma).toEqual([])
  })

  it('las operaciones tienen summary y responses', () => {
    const incompletas: string[] = []
    for (const [ruta, ops] of Object.entries(swaggerSpec.paths as Record<string, Record<string, Record<string, unknown>>>)) {
      for (const [metodo, op] of Object.entries(ops)) {
        if (!op.summary) incompletas.push(`${ruta} ${metodo}: summary`)
        if (!op.responses || Object.keys(op.responses).length === 0) incompletas.push(`${ruta} ${metodo}: responses`)
      }
    }
    expect(incompletas).toEqual([])
  })
})
