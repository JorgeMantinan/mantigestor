'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calculator } from 'lucide-react'
import {
  calcularCuotaLiquida,
  reduccionRendimientosTrabajoCents,
  deduccionTrabajoCents,
  DEDUCCION_TRABAJO_2025,
  DEDUCCION_TRABAJO_2026,
} from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_IRPF } from '@/lib/fiscal/guia-fiscal'
import { eur, parseEuros, type DatosFiscales } from './types'

interface DetalleTramo {
  tramo: number
  desdeCentimos: number
  hastaCentimos: number | null
  baseTramoCentimos: number
  tipoPct: number
  cuotaTramoCentimos: number
}

type GradoDiscapacidad = 'ninguna' | '33' | '65'
type RangoEdad = 'menos65' | '65a75' | 'mas75'

const eurosACentimos = (texto: string): number => Math.round((parseEuros(texto) ?? 0) * 100)

function TablaDetalle({ titulo, detalle }: { titulo: string; detalle: DetalleTramo[] }) {
  if (!detalle.length) return null
  return (
    <div className="mt-4">
      <p className="text-sm font-medium mb-2">{titulo}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b">
            <th className="py-1 font-normal">Tramo</th>
            <th className="py-1 font-normal">Base gravada</th>
            <th className="py-1 font-normal">Tipo</th>
            <th className="py-1 font-normal text-right">Cuota</th>
          </tr>
        </thead>
        <tbody>
          {detalle.map(t => (
            <tr key={t.tramo} className="border-b last:border-0">
              <td className="py-1">{t.tramo}</td>
              <td className="py-1">{eur(t.baseTramoCentimos)}</td>
              <td className="py-1">{t.tipoPct.toLocaleString('es-ES')}%</td>
              <td className="py-1 text-right">{eur(t.cuotaTramoCentimos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CalculadoraIrpf({
  datos,
  comunidad,
}: {
  datos: DatosFiscales
  comunidad: string
}) {
  const [trabajo, setTrabajo] = useState('')
  const [actividades, setActividades] = useState('')
  const [ahorro, setAhorro] = useState('')
  const [pagosACuenta, setPagosACuenta] = useState('')
  const [deduccionesManuales, setDeduccionesManuales] = useState('')

  const [edad, setEdad] = useState<RangoEdad>('menos65')
  const [conyuge, setConyuge] = useState(false)
  const [hijos, setHijos] = useState('0')
  const [menores3, setMenores3] = useState('0')
  const [ascendientes, setAscendientes] = useState('0')
  const [mayores75, setMayores75] = useState('0')
  const [monoparental, setMonoparental] = useState(false)
  const [discapacidad, setDiscapacidad] = useState<GradoDiscapacidad>('ninguna')
  const [ayudaTerceras, setAyudaTerceras] = useState(false)

  const minimosTerritorio = useMemo(() => {
    const propios = datos.minimos.filter(m => m.territorio === comunidad)
    if (propios.length) return { filas: propios, esReferenciaEstatal: false }
    const estatales = datos.minimos.filter(m => m.territorio.toLowerCase().includes('estatal'))
    return { filas: estatales, esReferenciaEstatal: true }
  }, [datos.minimos, comunidad])

  const imp = (conceptoExacto: string): number =>
    minimosTerritorio.filas.find(f => f.concepto === conceptoExacto)?.importeEur ?? 0

  const impContiene = (fragmento: string): number =>
    minimosTerritorio.filas.find(f => f.concepto.includes(fragmento))?.importeEur ?? 0

  const numACentimos = (n: number): number => Math.round(n * 100)

  const desgloseMinimo = useMemo(() => {
    const componentes: Array<{ etiqueta: string; centimos: number }> = []
    const factorMono = monoparental ? 1.5 : 1

    componentes.push({ etiqueta: 'Contribuyente', centimos: numACentimos(imp('Mínimo del contribuyente, general')) })
    if (edad !== 'menos65') {
      componentes.push({ etiqueta: 'Contribuyente mayor de 65 años', centimos: numACentimos(imp('Incremento mínimo contribuyente, mayor de 65 años')) })
    }
    if (edad === 'mas75') {
      componentes.push({ etiqueta: 'Contribuyente mayor de 75 años (adicional)', centimos: numACentimos(imp('Incremento adicional mínimo contribuyente, mayor de 75 años')) })
    }

    const nHijos = Math.max(0, parseInt(hijos, 10) || 0)
    if (nHijos > 0) {
      const importesHijos = [
        imp('Mínimo por descendiente, 1º'),
        imp('Mínimo por descendiente, 2º'),
        imp('Mínimo por descendiente, 3º'),
      ]
      const cuarto = imp('Mínimo por descendiente, 4º y siguientes')
      let suma = 0
      for (let i = 0; i < nHijos; i++) suma += i < 3 ? (importesHijos[i] ?? 0) : cuarto
      componentes.push({ etiqueta: `Descendientes (${nHijos})${monoparental ? ', familia monoparental ×1,5' : ''}`, centimos: numACentimos(suma * factorMono) })

      const nMenores3 = Math.min(Math.max(0, parseInt(menores3, 10) || 0), nHijos)
      if (nMenores3 > 0) {
        componentes.push({ etiqueta: `Menores de 3 años (${nMenores3})`, centimos: numACentimos(imp('Incremento por descendiente menor de 3 años') * nMenores3 * factorMono) })
      }
    }

    if (conyuge) {
      const valorConyuge = impContiene('ónyuge')
      if (valorConyuge > 0) componentes.push({ etiqueta: 'Cónyuge a cargo (rentas <8.000 €)', centimos: numACentimos(valorConyuge) })
    }

    const nAscendientes = Math.max(0, parseInt(ascendientes, 10) || 0)
    if (nAscendientes > 0) {
      const nMayores75 = Math.min(Math.max(0, parseInt(mayores75, 10) || 0), nAscendientes)
      const baseAscendente = imp('Mínimo por ascendiente (mayor 65 años o con discapacidad)')
      const sumaAsc =
        baseAscendente * (nAscendientes - nMayores75) +
        (baseAscendente + imp('Incremento por ascendiente mayor de 75 años')) * nMayores75
      componentes.push({ etiqueta: `Ascendientes a cargo (${nAscendientes})${monoparental ? ', familia monoparental ×1,5' : ''}`, centimos: numACentimos(sumaAsc * factorMono) })
    }

    if (discapacidad === '65') {
      componentes.push({ etiqueta: 'Discapacidad contribuyente ≥65%', centimos: numACentimos(impContiene('grado ≥65%')) })
      if (ayudaTerceras) {
        componentes.push({ etiqueta: 'Ayuda terceras personas / movilidad reducida', centimos: numACentimos(impContiene('Incremento por ayuda de terceras personas')) })
      }
    } else if (discapacidad === '33') {
      componentes.push({ etiqueta: 'Discapacidad contribuyente ≥33%', centimos: numACentimos(impContiene('grado ≥33%')) })
    }

    return componentes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edad, hijos, menores3, ascendientes, mayores75, monoparental, conyuge, discapacidad, ayudaTerceras, minimosTerritorio])

  const resultado = useMemo(() => {
    try {
      const trabajoCents = eurosACentimos(trabajo)
      const reduccion = trabajoCents > 0 ? reduccionRendimientosTrabajoCents(trabajoCents) : 0
      const baseGeneral = Math.max(0, trabajoCents - reduccion) + eurosACentimos(actividades)

      const escalasGenerales = [datos.escalaEstatal, datos.escalaAutonomica].filter(
        (e): e is NonNullable<typeof e> => e !== null
      )
      if (!escalasGenerales.length) return { error: 'No hay escala IRPF disponible para este territorio.' } as const

      const escalaAhorroForal = datos.escalaAhorroForal
      const escalasAhorro = escalaAhorroForal ? [escalaAhorroForal] : undefined

      // Deducción DA 61ª LIRPF (Ley 5/2025): reduce cuota íntegra para rentas bajas
      const deduccionParams = datos.taxYear >= 2026 ? DEDUCCION_TRABAJO_2026 : DEDUCCION_TRABAJO_2025
      const trabajoIntegroCents = eurosACentimos(trabajo)
      const deduccionTrabajo = deduccionTrabajoCents(trabajoIntegroCents, deduccionParams)
      const deduccionesManualesCents = eurosACentimos(deduccionesManuales)
      const totalDeduccionesCents = deduccionesManualesCents + deduccionTrabajo

      return {
        reduccionTrabajoCents: reduccion,
        deduccionTrabajoCents: deduccionTrabajo,
        resultado: calcularCuotaLiquida({
          baseGeneralCents: baseGeneral,
          baseAhorroCents: eurosACentimos(ahorro),
          minimoPersonalYFamiliarCents: desgloseMinimo.reduce((acc, c) => acc + c.centimos, 0),
          deduccionesCents: totalDeduccionesCents,
          pagosACuentaCents: eurosACentimos(pagosACuenta),
          escalasGenerales,
          escalasAhorro,
        }),
        error: null,
      } as const
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Error en el cálculo', resultado: null, reduccionTrabajoCents: 0, deduccionTrabajoCents: 0 } as const
    }
  }, [trabajo, actividades, ahorro, pagosACuenta, deduccionesManuales, desgloseMinimo, datos.escalaEstatal, datos.escalaAutonomica, datos.escalaAhorroForal, datos.taxYear])

  const sinEscalas = !datos.escalaEstatal && !datos.escalaAutonomica

  return (
    <Card>
      <CardHeader>
        <CardTitle>IRPF {datos.taxYear} · cuota líquida completa</CardTitle>
        <CardDescription>
          Reducción del trabajo (art. 20), mínimos personales y familiares, escala del ahorro (art. 63 LIRPF),
          deducción DA 61ª (Ley 5/2025), deducciones y pagos a cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium">Rentas</p>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="irpf-trabajo" ayuda={GUIA_IRPF.trabajo!}>Rendimiento neto del trabajo (€)</LabelConAyuda>
              <Input id="irpf-trabajo" type="number" min="0" step="0.01" placeholder="25000" value={trabajo} onChange={e => setTrabajo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="irpf-actividades" ayuda={GUIA_IRPF.actividades!}>Actividades económicas netas (€)</LabelConAyuda>
              <Input id="irpf-actividades" type="number" min="0" step="0.01" placeholder="0" value={actividades} onChange={e => setActividades(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="irpf-ahorro" ayuda={GUIA_IRPF.ahorro!}>Base liquidable del ahorro (€)</LabelConAyuda>
              <Input id="irpf-ahorro" type="number" min="0" step="0.01" placeholder="0" value={ahorro} onChange={e => setAhorro(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="irpf-deducciones" ayuda={GUIA_IRPF.deduccionesManuales!}>Deducciones estimadas (€)</LabelConAyuda>
              <Input id="irpf-deducciones" type="number" min="0" step="0.01" placeholder="0" value={deduccionesManuales} onChange={e => setDeduccionesManuales(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="irpf-pagos" ayuda={GUIA_IRPF.pagosACuenta!}>Retenciones y pagos fraccionados (€)</LabelConAyuda>
              <Input id="irpf-pagos" type="number" min="0" step="0.01" placeholder="0" value={pagosACuenta} onChange={e => setPagosACuenta(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Mínimo personal y familiar</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <LabelConAyuda htmlFor="irpf-edad" ayuda={GUIA_IRPF.edad!}>Edad del contribuyente</LabelConAyuda>
                <select
                  id="irpf-edad"
                  value={edad}
                  onChange={e => setEdad(e.target.value as RangoEdad)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="menos65">Menos de 65</option>
                  <option value="65a75">Entre 65 y 75</option>
                  <option value="mas75">Más de 75</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="irpf-discapacidad">Discapacidad contribuyente</Label>
                <select
                  id="irpf-discapacidad"
                  value={discapacidad}
                  onChange={e => setDiscapacidad(e.target.value as GradoDiscapacidad)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="ninguna">Ninguna</option>
                  <option value="33">Grado ≥33%</option>
                  <option value="65">Grado ≥65%</option>
                </select>
              </div>
              <div className="space-y-2">
                <LabelConAyuda htmlFor="irpf-hijos" ayuda={GUIA_IRPF.hijos!}>Descendientes</LabelConAyuda>
                <Input id="irpf-hijos" type="number" min="0" max="10" value={hijos} onChange={e => setHijos(e.target.value)} />
              </div>
              <div className="space-y-2">
                <LabelConAyuda htmlFor="irpf-menores3" ayuda={GUIA_IRPF.menores3!}>De ellos, menores de 3 años</LabelConAyuda>
                <Input id="irpf-menores3" type="number" min="0" max="10" value={menores3} onChange={e => setMenores3(e.target.value)} />
              </div>
              <div className="space-y-2">
                <LabelConAyuda htmlFor="irpf-ascendientes" ayuda={GUIA_IRPF.ascendientes!}>Ascendientes a cargo</LabelConAyuda>
                <Input id="irpf-ascendientes" type="number" min="0" max="10" value={ascendientes} onChange={e => setAscendientes(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="irpf-mayores75">De ellos, mayores de 75</Label>
                <Input id="irpf-mayores75" type="number" min="0" max="10" value={mayores75} onChange={e => setMayores75(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={conyuge} onChange={e => setConyuge(e.target.checked)} className="h-4 w-4 accent-[--primary]" />
                Cónyuge a cargo con rentas &lt;8.000 €
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={monoparental} onChange={e => setMonoparental(e.target.checked)} className="h-4 w-4 accent-[--primary]" />
                Familia monoparental (mínimos descendientes/ascendientes ×1,5)
              </label>
              <label className={`flex items-center gap-2 ${discapacidad !== '65' ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={ayudaTerceras}
                  disabled={discapacidad !== '65'}
                  onChange={e => setAyudaTerceras(e.target.checked)}
                  className="h-4 w-4 accent-[--primary]"
                />
                Ayuda de terceras personas o movilidad reducida (solo ≥65%)
              </label>
            </div>
            {minimosTerritorio.esReferenciaEstatal && (
              <p className="text-xs text-muted-foreground">
                Sin mínimos propios para {comunidad}: se usan los de referencia estatal (los forales tienen valores distintos).
              </p>
            )}
          </div>
        </div>

        {(sinEscalas || resultado.error) && (
          <p role="alert" className="text-sm text-destructive">
            {resultado.error ?? 'No hay escala disponible para este territorio.'}
          </p>
        )}

        {resultado.resultado && (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Reducción por rendimientos del trabajo</dt>
                <dd className="text-lg font-semibold">{eur(resultado.reduccionTrabajoCents)}</dd>
              </div>
              {resultado.deduccionTrabajoCents > 0 && (
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Deducción DA 61ª (Ley 5/2025)</dt>
                  <dd className="text-lg font-semibold">{eur(resultado.deduccionTrabajoCents)}</dd>
                </div>
              )}
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Mínimo personal y familiar</dt>
                <dd className="text-lg font-semibold">{eur(desgloseMinimo.reduce((acc, c) => acc + c.centimos, 0))}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota íntegra</dt>
                <dd className="text-lg font-semibold">{eur(resultado.resultado.cuotaIntegraTotalCents)}</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Cuota líquida</dt>
                <dd className="text-lg font-bold text-primary">{eur(resultado.resultado.cuotaLiquidaCents)}</dd>
                <dd className={`text-xs ${resultado.resultado.cuotaDiferenciaCents <= 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {resultado.resultado.cuotaDiferenciaCents <= 0
                    ? `Devolución estimada ${eur(Math.abs(resultado.resultado.cuotaDiferenciaCents))}`
                    : `A ingresar ${eur(resultado.resultado.cuotaDiferenciaCents)}`}
                </dd>
              </div>
            </dl>

            <div className="rounded-lg border p-3 text-sm space-y-1">
              <p className="font-medium mb-1">Composición del mínimo personal y familiar</p>
              {desgloseMinimo.map(c => (
                <p key={c.etiqueta} className="flex justify-between gap-4 text-muted-foreground">
                  <span>{c.etiqueta}</span>
                  <span>{eur(c.centimos)}</span>
                </p>
              ))}
            </div>

            <TablaDetalle titulo="Detalle escala estatal" detalle={resultado.resultado.detalleGeneral[0]?.detalle ?? []} />
            <TablaDetalle titulo={`Detalle escala autonómica (${comunidad})`} detalle={resultado.resultado.detalleGeneral[1]?.detalle ?? []} />
            <TablaDetalle titulo="Detalle base del ahorro (art. 63 LIRPF)" detalle={resultado.resultado.detalleAhorro[0]?.detalle ?? []} />

            <p className="text-xs text-muted-foreground">
              Cálculo orientativo: no incluye deducciones autonómicas específicas, aportaciones a planes de pensiones
              ni otras partidas particulares. Consulta la declaración oficial antes de presentar.
            </p>
          </>
        )}

        {!resultado.resultado && !resultado.error && !sinEscalas && (
          <Button disabled className="gap-2 opacity-60 cursor-default">
            <Calculator className="h-4 w-4" aria-hidden="true" />
            Introduce tus rentas para calcular
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
