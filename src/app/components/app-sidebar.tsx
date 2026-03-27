import { Home, Building2, Package, Compass, Settings, ChevronDown, ChevronLeft, LogOut, TrendingUp, Link as LinkIcon, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { logout } from '../../lib/firebase';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { icon: Home, label: 'Dashboard', path: '/overview' },
  { icon: Compass, label: 'Market Discovery', path: '/discovering' },
  { icon: TrendingUp, label: 'Price Activity', path: '/price-board' },
  { icon: LinkIcon, label: 'Tracked Listings', path: '/tracked-urls' },
  { icon: Package, label: 'Products', path: '/products' },
  { icon: Building2, label: 'Stores', path: '/companies' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const SECTIONS = [
  {
    key: 'ai',
    label: 'AI',
    items: [
      { icon: Compass, label: 'Market Discovery', path: '/discovering' },
    ],
  },
  {
    key: 'monitoring',
    label: 'Monitoring',
    items: [
      { icon: TrendingUp, label: 'Price Activity', path: '/price-board' },
      { icon: LinkIcon, label: 'Tracked Listings', path: '/tracked-urls' },
    ],
  },
  {
    key: 'catalog',
    label: 'Catalog',
    items: [
      { icon: Package, label: 'Products', path: '/products' },
      { icon: Building2, label: 'Stores', path: '/companies' },
    ],
  },
  {
    key: 'system',
    label: 'System',
    items: [
      { icon: Settings, label: 'Settings', path: '/settings' },
    ],
  },
];

export function AppSidebar() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ ai: true, monitoring: true, catalog: true, system: true });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    try { await logout(); navigate('/'); }
    catch { toast.error('Logout failed'); }
  };

  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const isActive = (path: string) => location.pathname === path;
  const lc = (path: string) =>
    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ' +
    (isActive(path) ? 'bg-accent/60 text-foreground' : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground');

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-sm rotate-45" />
          </div>
          <span className="font-semibold text-[15px]">MJQ APP</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-gray-100">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl md:hidden flex flex-col">
            <div className="p-5 pb-3 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-sm rotate-45" />
                </div>
                <span className="font-semibold text-[15px]">MJQ APP</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <ul className="space-y-1">
                {NAV_ITEMS.map(item => (
                  <li key={item.label}>
                    <Link
                      to={item.path}
                      className={'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ' +
                        (isActive(item.path) ? 'bg-accent/60 text-foreground font-medium' : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground')}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="p-4 border-t border-gray-100 space-y-1">
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/30">
                <LogOut className="w-4 h-4" /><span>Log out</span>
              </button>
              <p className="text-[10px] text-muted-foreground px-3">v1.0.8</p>
            </div>
          </div>
        </>
      )}

      {/* Desktop collapsed */}
      {collapsed && (
        <div className="hidden md:flex w-[56px] bg-white h-screen flex-col border-r border-gray-200/80 shrink-0">
          <div className="p-3 pb-2 flex justify-center">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-white rounded-sm rotate-45" />
            </div>
          </div>
          <nav className="flex-1 px-2 space-y-1 mt-2">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.label}
                to={item.path}
                title={item.label}
                className={'flex items-center justify-center p-2 rounded-lg transition-colors ' +
                  (isActive(item.path) ? 'bg-accent/60 text-foreground' : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground')}
              >
                <item.icon className="w-4 h-4" />
              </Link>
            ))}
          </nav>
          <div className="p-2 mt-auto space-y-1">
            <button onClick={() => setCollapsed(false)} title="Expand" className="w-full flex items-center justify-center p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/30">
              <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            </button>
            <button onClick={handleLogout} title="Log out" className="w-full flex items-center justify-center p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/30">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop expanded */}
      {!collapsed && (
        <div className="hidden md:flex w-[200px] bg-white h-screen flex-col border-r border-gray-200/80 shrink-0">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-sm rotate-45" />
              </div>
              <span className="font-semibold text-[15px]">MJQ APP</span>
            </div>
          </div>
          <nav className="flex-1 px-3 overflow-y-auto">
            {/* Dashboard — standalone */}
            <ul className="space-y-0.5 mb-4">
              <li>
                <Link to="/overview" className={lc('/overview')}>
                  <Home className="w-4 h-4" /><span className="text-[13px]">Dashboard</span>
                </Link>
              </li>
            </ul>

            {/* Grouped sections */}
            {SECTIONS.map(section => (
              <div key={section.key} className="mb-4">
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-lg hover:bg-accent/20"
                >
                  <span>{section.label}</span>
                  <ChevronDown className={'w-3 h-3 ml-auto transition-transform ' + (openSections[section.key] ? 'rotate-180' : '')} />
                </button>
                {openSections[section.key] && (
                  <ul className="mt-1 space-y-0.5">
                    {section.items.map(item => (
                      <li key={item.path}>
                        <Link to={item.path} className={lc(item.path)}>
                          <item.icon className="w-4 h-4" /><span className="text-[13px]">{item.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
          <div className="p-4 mt-auto">
            <div className="space-y-1">
              <button onClick={() => setCollapsed(true)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/30">
                <ChevronLeft className="w-3.5 h-3.5" /><span>Collapse sidebar</span>
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/30">
                <LogOut className="w-3.5 h-3.5" /><span>Log out</span>
              </button>
              <div className="px-3 py-1">
                <span className="text-[10px] text-muted-foreground">v1.0.8</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
