import { AppSidebar } from '../components/app-sidebar';
import { AppMainContent } from '../components/app-main-content';
import { Link } from 'react-router';
import { Palette } from 'lucide-react';

export function MainApp() {
  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <AppSidebar />
      <AppMainContent />
      
      {/* Floating Demo Link */}
      <Link 
        to="/components"
        className="fixed bottom-6 right-6 bg-black text-white px-4 py-3 rounded-full shadow-lg hover:bg-gray-800 transition-all hover:scale-105 flex items-center gap-2 z-50"
      >
        <Palette className="w-4 h-4" />
        <span className="text-sm font-medium">View All Components</span>
      </Link>
    </div>
  );
}