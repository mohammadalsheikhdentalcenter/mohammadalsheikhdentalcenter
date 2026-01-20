import { Spinner } from "@/components/ui/spinner"
import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 bg-muted rounded w-48 mb-4"></div>
          <div className="h-5 bg-muted rounded w-64"></div>
        </div>

        {/* Search and filter skeleton */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 h-10 bg-muted rounded"></div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded w-20"></div>
            ))}
          </div>
        </div>

        {/* Chat list skeleton */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="h-5 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
