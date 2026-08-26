import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import type { GuiaCampo } from '@/lib/fiscal/guia-fiscal'

export function LabelConAyuda({
  htmlFor,
  children,
  ayuda,
}: {
  htmlFor: string
  children: ReactNode
  ayuda?: GuiaCampo
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm">{children}</Label>
      {ayuda && <HelpTooltip titulo={ayuda.titulo} contenido={ayuda.contenido} ejemplos={ayuda.ejemplos} dondeVer={ayuda.dondeVer} />}
    </div>
  )
}
