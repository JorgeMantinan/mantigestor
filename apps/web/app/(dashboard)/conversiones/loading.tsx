import { Card, CardContent } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="h-10 w-full bg-muted rounded" />
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <div className="h-5 w-20 bg-muted rounded" />
                <div className="h-5 w-5 bg-muted rounded" />
                <div className="h-5 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
