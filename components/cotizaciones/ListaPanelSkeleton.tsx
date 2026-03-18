export default function ListaPanelSkeleton() {
  return (
    <div className="flex flex-col h-full border-r border-[var(--border-default)] bg-[var(--bg-card)]">
      {/* Tabs skeleton */}
      <div className="flex items-center gap-0.5 px-3 pt-3 pb-2 border-b border-[var(--border-default)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-14 animate-pulse rounded-[5px] bg-[var(--bg-muted)]"
          />
        ))}
      </div>

      {/* Search skeleton */}
      <div className="px-3 py-2 border-b border-[var(--border-default)]">
        <div className="h-7 w-full animate-pulse rounded-[5px] bg-[var(--bg-muted)]" />
      </div>

      {/* List rows skeleton */}
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-3 py-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-1">
              <div className="h-4 w-28 animate-pulse rounded-md bg-[var(--bg-muted)]" />
              <div className="h-4 w-14 animate-pulse rounded-md bg-[var(--bg-muted)]" />
            </div>
            <div className="h-3 w-36 animate-pulse rounded-md bg-[var(--bg-muted)] mb-1" />
            <div className="flex items-center justify-between mt-1">
              <div className="h-3 w-20 animate-pulse rounded-md bg-[var(--bg-muted)]" />
              <div className="h-3 w-16 animate-pulse rounded-md bg-[var(--bg-muted)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
