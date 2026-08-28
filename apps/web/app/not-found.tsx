import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <SearchX className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Página no encontrada</h2>
          <p className="text-sm text-muted-foreground">
            La página que buscas no existe o ha sido movida.
          </p>
          <Link href="/">
            <Button>Volver al inicio</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
