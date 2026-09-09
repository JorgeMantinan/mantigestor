import { Card, CardContent } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 space-y-3">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-6 w-32 bg-muted rounded" />
              <div className="h-3 w-40 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="h-[300px] bg-muted rounded" />
        </CardContent>
      </Card>
    </div>
  )
}
