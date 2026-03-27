import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, logout } from '../../lib/firebase';
import { usersApi, ROLES } from '../../lib/monitorApi';
import type { AllowedUser } from '../../lib/monitorApi';

interface UserContextValue {
  appUser: AllowedUser | null;
  roleName: string;
  isManagement: boolean;
  refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

type Status = 'loading' | 'authorized' | 'unauthorized';

interface Props {
  children: React.ReactNode;
  onStatus: (s: Status) => void;
}

const MANAGEMENT_ROLES = ['001', '003', '004'];

export function UserProvider({ children, onStatus }: Props) {
  const [appUser, setAppUser] = useState<AllowedUser | null>(null);

  const check = useCallback(async () => {
    onStatus('loading');
    try {
      const res = await usersApi.me();
      setAppUser(res.data);
      onStatus('authorized');
    } catch {
      await logout();
      onStatus('unauthorized');
    }
  }, [onStatus]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) check();
    });
    return unsub;
  }, [check]);

  const roleName = appUser ? (ROLES[appUser.role] ?? appUser.role) : '';
  const isManagement = appUser ? MANAGEMENT_ROLES.includes(appUser.role) : false;

  return (
    <UserContext.Provider value={{ appUser, roleName, isManagement, refetch: check }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be inside UserProvider');
  return ctx;
}
