import { Card, CardContent } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-20 bg-muted rounded" />
      <div className="h-8 w-48 bg-muted rounded" />
      <Card>
        <CardContent className="p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-5 w-full bg-muted rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
