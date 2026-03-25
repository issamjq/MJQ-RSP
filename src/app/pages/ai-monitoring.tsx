import { AppSidebar } from '../components/app-sidebar';
import { Eye } from 'lucide-react';

export function AIMonitoring() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">AI Monitoring</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            AI-powered monitoring and insights
          </p>
          
          <div className="bg-white rounded-xl p-12 border border-gray-100 shadow-sm text-center">
            <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-lg font-semibold mb-2">AI Monitoring Page</h2>
            <p className="text-sm text-muted-foreground">Content coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
