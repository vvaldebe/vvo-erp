export default function DashboardLoading() {
  return (
    <div className="max-w-5xl space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-[var(--bg-muted)]" />
        <div className="h-4 w-36 animate-pulse rounded-md bg-[var(--bg-muted)]" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-[var(--border-default)] rounded-[8px] p-5 bg-[var(--bg-card)]">
            <div className="flex items-start justify-between mb-4">
              <div className="h-4 w-28 animate-pulse rounded-md bg-[var(--bg-muted)]" />
              <div className="h-4 w-4 animate-pulse rounded-md bg-[var(--bg-muted)]" />
            </div>
            <div className="h-9 w-20 animate-pulse rounded-md bg-[var(--bg-muted)]" />
            <div className="h-3 w-32 animate-pulse rounded-md bg-[var(--bg-muted)] mt-2" />
          </div>
        ))}
      </div>

      {/* Lower panels skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border border-[var(--border-default)] rounded-[8px]">
            <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded-md bg-[var(--bg-muted)]" />
              <div className="h-3 w-16 animate-pulse rounded-md bg-[var(--bg-muted)]" />
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between px-5 py-3">
                  <div className="space-y-1.5">
                    <div className="h-4 w-24 animate-pulse rounded-md bg-[var(--bg-muted)]" />
                    <div className="h-3 w-32 animate-pulse rounded-md bg-[var(--bg-muted)]" />
                  </div>
                  <div className="h-5 w-14 animate-pulse rounded-md bg-[var(--bg-muted)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
