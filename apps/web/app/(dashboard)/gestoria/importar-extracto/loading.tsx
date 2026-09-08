import { Card, CardContent } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 bg-muted rounded-xl" />
        <div>
          <div className="h-7 w-56 bg-muted rounded mb-1" />
          <div className="h-4 w-72 bg-muted rounded" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
            <div className="h-5 w-24 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
            <div className="h-10 w-40 bg-muted rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
