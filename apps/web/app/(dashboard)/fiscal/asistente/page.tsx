'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { BotonPDF } from '@/components/boton-pdf'
import { asistenteFiscal, agruparModelosPorCategoria, modelosObligatorios, type SituacionFiscal, type ModeloFiscal } from '@mantigestor/utils'
import { Calculator, FileText, Users, Globe, Coins, Building2 } from 'lucide-react'
import Link from 'next/link'
import { SELECT_CLS } from '@/lib/ui-constants'
import { useLanguage } from '@/contexts/language-context'

const iconos: Record<string, React.ReactNode> = {
  iva: <Calculator className="h-4 w-4" />,
  irpf: <FileText className="h-4 w-4" />,
  retenciones: <Users className="h-4 w-4" />,
  sociedades: <Building2 className="h-4 w-4" />,
  catastro: <Globe className="h-4 w-4" />,
  otros: <Coins className="h-4 w-4" />,
}

const coloresCategoria: Record<string, string> = {
  iva: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  irpf: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  retenciones: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  sociedades: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  catastro: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  otros: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

const coloresPrioridad: Record<string, string> = {
  alta: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  baja: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export default function AsistenteFiscalPage() {
  const { t } = useLanguage()
  const [situacion, setSituacion] = useState<SituacionFiscal>({
    actividad: 'autonomo',
    tieneEmpleados: false,
    retencionesProfesionales: false,
    arrendamientoInmuebles: false,
    criptomonedas: false,
    bienesExtranjero: false,
    paraisosFiscales: false,
    transparenciaFiscal: false,
    donaciones: false,
    inversionesExtranjeras: false,
    noResidente: false,
    rentasExentas: false,
    plusvalias: false,
    comunidadAutonoma: 'Madrid',
  })

  const modelos = useMemo(() => asistenteFiscal(situacion), [situacion])
  const obligatorios = useMemo(() => modelosObligatorios(modelos), [modelos])
  const grupos = useMemo(() => agruparModelosPorCategoria(modelos), [modelos])

  const toggle = (campo: keyof SituacionFiscal) => {
    setSituacion(prev => ({ ...prev, [campo]: !prev[campo] }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('asistenteFiscal.titulo')}</h1>
          <p className="text-muted-foreground">
            {t('asistenteFiscal.subtitulo')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('asistenteFiscal.tuSituacion')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('asistenteFiscal.tipoActividad')}</Label>
                <select
                  value={situacion.actividad}
                  onChange={(e) => setSituacion(prev => ({ ...prev, actividad: e.target.value as SituacionFiscal['actividad'] }))}
                  className={SELECT_CLS}
                >
                  <option value="autonomo">{t('asistenteFiscal.autonomo')}</option>
                  <option value="sociedad">{t('asistenteFiscal.sociedad')}</option>
                  <option value="asalariado">{t('asistenteFiscal.asalariado')}</option>
                  <option value="pensionista">{t('asistenteFiscal.pensionista')}</option>
                  <option value="alquilador">{t('asistenteFiscal.alquilador')}</option>
                  <option value="inversor">{t('asistenteFiscal.inversor')}</option>
                </select>
              </div>

              <div className="space-y-3">
                <Label>{t('asistenteFiscal.situacionesEspeciales')}</Label>
                {([
                  ['tieneEmpleados', t('asistenteFiscal.tieneEmpleados')],
                  ['retencionesProfesionales', t('asistenteFiscal.retencionesProfesionales')],
                  ['arrendamientoInmuebles', t('asistenteFiscal.arrendamientoInmuebles')],
                  ['criptomonedas', t('asistenteFiscal.criptomonedas')],
                  ['bienesExtranjero', t('asistenteFiscal.bienesExtranjero')],
                  ['paraisosFiscales', t('asistenteFiscal.paraisosFiscales')],
                  ['transparenciaFiscal', t('asistenteFiscal.transparenciaFiscal')],
                  ['donaciones', t('asistenteFiscal.donaciones')],
                  ['inversionesExtranjeras', t('asistenteFiscal.inversionesExtranjeras')],
                  ['noResidente', t('asistenteFiscal.noResidente')],
                  ['rentasExentas', t('asistenteFiscal.rentasExentas')],
                  ['plusvalias', t('asistenteFiscal.plusvalias')],
                ] as Array<[keyof SituacionFiscal, string]>).map(([campo, label]) => (
                  <label key={campo} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={situacion[campo] as boolean}
                      onCheckedChange={() => toggle(campo)}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <Label>{t('asistenteFiscal.comunidadAutonoma')}</Label>
                <select
                  value={situacion.comunidadAutonoma}
                  onChange={(e) => setSituacion(prev => ({ ...prev, comunidadAutonoma: e.target.value }))}
                  className={SELECT_CLS}
                >
                  <option value="Madrid">Madrid</option>
                  <option value="Cataluña">Cataluña</option>
                  <option value="Valencia">Valencia</option>
                  <option value="Andalucía">Andalucía</option>
                  <option value="País Vasco">País Vasco</option>
                  <option value="Galicia">Galicia</option>
                  <option value="Otra">Otra</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">
                    {t('asistenteFiscal.modelosPresentar')} ({modelos.length})
                  </CardTitle>
                  <CardDescription>
                    {obligatorios.length} {t('asistenteFiscal.obligatorios')} · {modelos.length - obligatorios.length} {t('asistenteFiscal.opcionales')}
                  </CardDescription>
                </div>
                <BotonPDF elementId="pdf-asistente-fiscal" filename="asistente-fiscal" label={t('asistenteFiscal.exportarPdf')} />
              </div>
            </CardHeader>
            <CardContent id="pdf-asistente-fiscal">
              <div className="space-y-6">
                {Object.entries(grupos).map(([categoria, modelosGrupo]) => (
                  <div key={categoria}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`p-1 rounded ${coloresCategoria[categoria]}`}>
                        {iconos[categoria]}
                      </span>
                      <h3 className="text-sm font-medium capitalize">{categoria}</h3>
                      <Badge variant="outline" className="text-xs">{modelosGrupo.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {modelosGrupo.map((modelo, i) => (
                        <ModeloCard key={`${modelo.modelo}-${i}`} modelo={modelo} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ModeloCard({ modelo }: { modelo: ModeloFiscal }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold">{modelo.modelo}</span>
            <Badge className={`text-xs ${coloresPrioridad[modelo.prioridad]}`}>
              {modelo.prioridad}
            </Badge>
            {modelo.obligatorio && (
              <Badge variant="outline" className="text-xs">{t('asistenteFiscal.obligatorio')}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{modelo.nombre}</p>
          <p className="text-xs text-muted-foreground">{modelo.descripcion}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{modelo.frecuencia}</p>
          {modelo.plazos[0] != null && (
            <p className="text-xs font-medium">{modelo.plazos[0]}</p>
          )}
        </div>
        <Link href={modelo.urlCalculadora}>
          <Button variant="outline" size="sm">
            <Calculator className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
