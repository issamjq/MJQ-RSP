import { Building2, Package, Link, RefreshCw, TrendingUp, Sparkles } from 'lucide-react';
import { AppSidebar } from '../components/app-sidebar';

export function Overview() {
  const stats = [
    {
      label: 'COMPANIES',
      value: '14',
      subtitle: 'Active marketplaces',
      icon: Building2,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
    {
      label: 'PRODUCTS',
      value: '111',
      subtitle: 'In reference catalog',
      icon: Package,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
    {
      label: 'TRACKED URLS',
      value: '66',
      subtitle: 'Active URL mappings',
      icon: Link,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
    {
      label: 'LAST SYNC RATE',
      value: '92%',
      subtitle: '23/25 succeeded',
      icon: RefreshCw,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
  ];

  const quickAccessItems = [
    {
      title: 'Latest Prices',
      description: 'Live price board with price per product per store',
      count: '62',
      icon: TrendingUp,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
    {
      title: 'Product URLs',
      description: 'Manage & scrape product URLs being tracked',
      count: '66',
      icon: Link,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
    {
      title: 'Sync Runs',
      description: 'Scraper execution history & per-company/unit',
      icon: RefreshCw,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
    {
      title: 'Products',
      description: 'Reference catalog — your internal product list',
      count: '111',
      icon: Package,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
    {
      title: 'Companies',
      description: 'Monitored marketplaces & scraper config',
      count: '14',
      icon: Building2,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
    {
      title: 'Auto-Discover',
      description: 'Find product URLs on any store automatically',
      icon: Sparkles,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Home</h1>
              <p className="text-sm text-muted-foreground">
                Price monitoring across 14 companies • 66 active tracked URLs
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Run All</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xs font-medium text-muted-foreground tracking-wide">
                    {stat.label}
                  </div>
                  <div className={`${stat.iconBg} ${stat.iconColor} p-2 rounded-lg`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-semibold mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
              </div>
            ))}
          </div>

          {/* Quick Access */}
          <div className="mb-4">
            <h2 className="text-base font-semibold mb-1">
              Quick Access{' '}
              <span className="text-sm font-normal text-muted-foreground">
                — jump to any section directly
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {quickAccessItems.map((item) => (
              <button
                key={item.title}
                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group hover:border-gray-200"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`${item.iconBg} ${item.iconColor} p-3 rounded-xl`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  {item.count && (
                    <div className="ml-auto text-lg font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                      {item.count}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}