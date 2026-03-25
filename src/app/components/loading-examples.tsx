import { Skeleton } from './ui/skeleton';
import { Card, CardHeader, CardContent, CardFooter } from './ui/card';
import { Loader2 } from 'lucide-react';

export function LoadingExamples() {
  return (
    <div className="space-y-8">
      {/* Skeleton Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Skeleton Loaders</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full mb-2" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-5/6" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full mb-2" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-5/6" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full mb-2" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-5/6" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* List Skeletons */}
      <div>
        <h3 className="text-lg font-semibold mb-4">List Skeleton</h3>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spinner States */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Loading Spinners</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </Card>

          <Card className="flex flex-col items-center justify-center p-8 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </Card>

          <Card className="flex flex-col items-center justify-center p-8 gap-3">
            <div className="flex gap-1">
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-sm text-muted-foreground">Processing...</p>
          </Card>

          <Card className="flex flex-col items-center justify-center p-8 gap-3">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-accent rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </Card>
        </div>
      </div>

      {/* Button Loading States */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Button Loading States</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2" disabled>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </button>

          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 opacity-50 cursor-not-allowed" disabled>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </button>

          <button className="px-4 py-2 border border-border rounded-lg flex items-center gap-2" disabled>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </button>

          <button className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center gap-2" disabled>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </button>
        </div>
      </div>
    </div>
  );
}
