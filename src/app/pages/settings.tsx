import { AppSidebar } from '../components/app-sidebar';
import { Settings as SettingsIcon, User, Mail, Bell, Lock, Palette, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { toast } from 'sonner';

export function Settings() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setEmail(user.email || '');
        setDisplayName(user.displayName || '');
      }
      setLoadingUser(false);
    });
    return unsub;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Account information saved');
  };

  if (loadingUser) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8">Manage your account and application preferences</p>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Account Information</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {displayName && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4" />
                    Display Name
                  </label>
                  <input type="text" value={displayName} readOnly className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-muted-foreground cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground mt-2">Name from your Google account</p>
                </div>
              )}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input type="email" value={email} readOnly className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-muted-foreground cursor-not-allowed" />
                <p className="text-xs text-muted-foreground mt-2">Signed in via Google. Email managed by your Google account.</p>
              </div>
              <form onSubmit={handleSave}>
                <div className="flex justify-end pt-2">
                  <button type="submit" className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-sm font-medium">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold">Security</h3>
              </div>
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold">Appearance</h3>
              </div>
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
