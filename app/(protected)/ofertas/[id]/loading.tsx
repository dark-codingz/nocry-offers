export default function Loading() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-9 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-96 w-full animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  )
}

