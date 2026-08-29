import { Skeleton } from '@/components/ui/skeleton'

export default function AlquilerLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid gap-6">
        {[1, 2].map(i => (
          <div key={i} className="rounded-lg border p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex gap-6">
              <Skeleton className="h-16 w-28" />
              <Skeleton className="h-16 w-28" />
              <Skeleton className="h-16 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
