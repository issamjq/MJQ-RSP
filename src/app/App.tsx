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
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Please wait</p>
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
