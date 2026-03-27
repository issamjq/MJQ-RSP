import { useEffect, useState, useCallback } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { auth, logout } from '../lib/firebase';
import type { User } from 'firebase/auth';
import { Login } from './pages/login';
import { DiscoveryProvider } from './contexts/discovery-context';
import { UserProvider } from './contexts/user-context';

type AccessStatus = 'loading' | 'authorized' | 'unauthorized';

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('loading');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u);
      if (!u) setAccessStatus('loading');
    });
    return unsub;
  }, []);

  const handleStatus = useCallback((s: AccessStatus) => setAccessStatus(s), []);

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

  if (accessStatus === 'loading') {
    return (
      <UserProvider onStatus={handleStatus}>
        <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Checking access…</p>
        </div>
        <Toaster />
      </UserProvider>
    );
  }

  if (accessStatus === 'unauthorized') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-red-50/40 via-white to-red-50/20 flex items-center justify-center p-4">
          <div className="w-full max-w-sm text-center">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
            <p className="text-sm text-muted-foreground mb-1">
              Your account is not authorised to access this application.
            </p>
            <p className="text-sm font-medium mb-6">{user.email}</p>
            <p className="text-xs text-muted-foreground mb-6">Contact your administrator to request access.</p>
            <button
              onClick={() => logout()}
              className="px-6 py-2.5 bg-black text-white text-sm rounded-xl hover:bg-gray-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
        <Toaster />
      </>
    );
  }

  return (
    <UserProvider onStatus={handleStatus}>
      <DiscoveryProvider>
        <RouterProvider router={router} />
        <Toaster />
      </DiscoveryProvider>
    </UserProvider>
  );
}
