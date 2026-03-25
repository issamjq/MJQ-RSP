import { AppSidebar } from '../components/app-sidebar';
import { Settings as SettingsIcon, User, Mail, Bell, Lock, Palette } from 'lucide-react';
import { useState } from 'react';

export function Settings() {
  const [email, setEmail] = useState('user@example.com');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            Manage your account and application preferences
          </p>
          
          {/* Account Settings */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Account Information</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm"
                  placeholder="your.email@example.com"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This email will be used for notifications and account recovery
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <button className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-sm font-medium">
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* Additional Settings Sections (Coming Soon) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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