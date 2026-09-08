import { Card, CardContent } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-48 bg-muted rounded mb-1" />
        <div className="h-4 w-72 bg-muted rounded" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-24 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-10 w-64 bg-muted rounded" />
        </CardContent>
      </Card>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
              </div>
              <div className="h-8 w-12 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
