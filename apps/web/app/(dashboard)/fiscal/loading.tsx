export default function LoadingFiscal() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded bg-muted" />
      <div className="h-4 w-96 rounded bg-muted" />
      <div className="rounded-xl border p-6 space-y-4">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <div className="h-9 rounded bg-muted" />
          <div className="h-9 rounded bg-muted" />
          <div className="h-9 w-28 rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
