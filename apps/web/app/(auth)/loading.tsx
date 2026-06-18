import { Card, CardContent } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen animate-pulse">
      <Card className="mx-auto w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-10 w-full bg-muted rounded" />
          <div className="h-10 w-full bg-muted rounded" />
        </CardContent>
      </Card>
    </div>
  )
}
