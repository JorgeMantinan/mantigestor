export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 pt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted/20" />
        ))}
      </div>
    </div>
  )
}
