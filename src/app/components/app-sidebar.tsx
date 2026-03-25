import { Home, Shield, Building2, Package, BarChart3, Compass, Eye, Settings, ChevronDown, Sparkles, ChevronLeft, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';

export function AppSidebar() {
  const [aiToolsOpen, setAiToolsOpen] = useState(true);
  const [priceMonitorOpen, setPriceMonitorOpen] = useState(true);
  const location = useLocation();

  const mainNav = [
    { icon: Home, label: 'Home', path: '/' },
  ];

  const aiTools = [
    { icon: Compass, label: 'Discovering', path: '/discovering' },
  ];

  const priceMonitor = [
    { icon: Shield, label: 'Overview', path: '/overview' },
    { icon: Building2, label: 'Companies', path: '/companies' },
    { icon: Package, label: 'Products', path: '/products' },
  ];

  return (
    <div className="w-[200px] bg-white h-screen flex flex-col border-r border-gray-200/80">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-sm transform rotate-45"></div>
          </div>
          <span className="font-semibold text-[15px]">MJQ APP</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-0.5">
          {mainNav.map((item) => (
            <li key={item.label}>
              <Link
                to={item.path}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative ${
                  location.pathname === item.path
                    ? 'bg-accent/60 text-foreground'
                    : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-[13px]">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* AI Tools Section */}
        <div className="mt-6">
          <button
            onClick={() => setAiToolsOpen(!aiToolsOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-accent/30 rounded-lg transition-colors"
          >
            <span className="font-medium">AI tools</span>
            <ChevronDown
              className={`w-3 h-3 ml-auto transition-transform ${
                aiToolsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {aiToolsOpen && (
            <ul className="mt-1 space-y-0.5">
              {aiTools.map((item) => (
                <li key={item.label}>
                  <Link 
                    to={item.path}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-accent/60 text-foreground'
                        : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-[13px]">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Price Monitor Section */}
        <div className="mt-6">
          <button
            onClick={() => setPriceMonitorOpen(!priceMonitorOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-accent/30 rounded-lg transition-colors"
          >
            <span className="font-medium">Price Monitor</span>
            <ChevronDown
              className={`w-3 h-3 ml-auto transition-transform ${
                priceMonitorOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {priceMonitorOpen && (
            <ul className="mt-1 space-y-0.5">
              {priceMonitor.map((item) => (
                <li key={item.label}>
                  <Link 
                    to={item.path}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-accent/60 text-foreground'
                        : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-[13px]">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Settings */}
        <div className="mt-6">
          <ul className="space-y-0.5">
            <li>
              <Link 
                to="/settings"
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === '/settings'
                    ? 'bg-accent/60 text-foreground'
                    : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="text-[13px]">Settings</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 mt-auto">
        {/* Collapse and Logout */}
        <div className="space-y-1">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Collapse sidebar</span>
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
          <div className="px-3 py-1">
            <span className="text-[10px] text-muted-foreground">v1.0.7</span>
          </div>
        </div>
      </div>
    </div>
  );
}