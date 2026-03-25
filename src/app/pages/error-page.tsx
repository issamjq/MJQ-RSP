import { useRouteError, Link } from 'react-router';
import { AppSidebar } from '../components/app-sidebar';
import { AlertCircle } from 'lucide-react';

export function ErrorPage() {
  const error = useRouteError() as any;
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20">
        <div className="max-w-7xl mx-auto p-8 flex items-center justify-center min-h-screen">
          <div className="bg-white rounded-xl p-12 border border-gray-100 shadow-sm text-center max-w-md">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-semibold mb-2">Oops!</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Sorry, an unexpected error has occurred.
            </p>
            {error?.statusText || error?.message ? (
              <p className="text-sm text-gray-600 mb-6 font-mono bg-gray-50 p-3 rounded">
                {error.statusText || error.message}
              </p>
            ) : null}
            <Link 
              to="/"
              className="inline-block px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
