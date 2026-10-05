
export default function Loading() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-pulse">
      <div className="flex-1 space-y-4 p-4 overflow-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className={`rounded-lg p-3 ${i % 2 === 0 ? 'bg-muted' : 'bg-muted/50'}`}>
              <div className="h-4 w-48 bg-muted-foreground/20 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        <div className="h-10 w-full bg-muted rounded-full" />
      </div>
    </div>
  )
}
