import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { auth } from '../lib/firebase';
import type { User } from 'firebase/auth';
import { Login } from './pages/login';
import { DiscoveryProvider } from './contexts/discovery-context';

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return unsub;
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-sm transform rotate-45" />
          </div>
          <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login />
        <Toaster />
      </>
    );
  }

  return (
    <DiscoveryProvider>
      <RouterProvider router={router} />
      <Toaster />
    </DiscoveryProvider>
  );
}
