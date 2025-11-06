export default function Loading() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-9 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="flex gap-4">
        <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="flex gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="min-w-[300px] space-y-3 rounded-lg bg-gray-100 p-3">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
            <div className="space-y-2">
            <div className="h-24 animate-pulse rounded-lg bg-card" />
            <div className="h-24 animate-pulse rounded-lg bg-card" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

