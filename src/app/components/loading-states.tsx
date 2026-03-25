import { Skeleton } from './ui/skeleton';
import { Card } from './ui/card';
import { Loader2 } from 'lucide-react';

export function LoadingStates() {
  return (
    <div className="space-y-4">
      {/* Card Loading State */}
      <Card className="p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </Card>

      {/* Spinner Loading */}
      <div className="flex items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200">
        <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
        <span className="text-sm text-gray-600">Loading content...</span>
      </div>

      {/* List Loading State */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
