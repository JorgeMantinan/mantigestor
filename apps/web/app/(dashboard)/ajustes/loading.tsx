import { Skeleton } from '@/components/ui/skeleton'

export default function AjustesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
