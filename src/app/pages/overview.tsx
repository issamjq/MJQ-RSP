import { Building2, Package, Link as LinkIcon, RefreshCw, TrendingUp, Sparkles, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AppSidebar } from '../components/app-sidebar';
import { useEffect, useState, useCallback } from 'react';
import { statsApi, syncRunsApi, snapshotsApi, scraperApi } from '../../lib/monitorApi';
import type { SyncRun, PriceSnapshot } from '../../lib/monitorApi';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

export function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ companies: 0, products: 0, tracked_urls: 0, last_sync_rate: 0, last_sync_succeeded: 0, last_sync_total: 0 });
  const [recentRuns, setRecentRuns] = useState<SyncRun[]>([]);
  const [errors, setErrors] = useState<PriceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [statsRes, runsRes, errorsRes] = await Promise.allSettled([
      statsApi.get(),
      syncRunsApi.list({ limit: 5 }),
      snapshotsApi.list({ scrape_status: 'error', limit: 5 }),
    ]);

    if (statsRes.status === 'fulfilled') {
      setStats(statsRes.value.data);
    } else {
      console.error('Stats failed:', statsRes.reason);
      // Fall back: derive counts from other data if stats endpoint missing
      try {
        const [companiesRes, productsRes, urlsRes] = await Promise.allSettled([
          import('../../lib/monitorApi').then(m => m.companiesApi.list()),
          import('../../lib/monitorApi').then(m => m.productsApi.list({ limit: 1 })),
          import('../../lib/monitorApi').then(m => m.urlsApi.list({ limit: 1 })),
        ]);
        setStats(prev => ({
          ...prev,
          companies: companiesRes.status === 'fulfilled' ? companiesRes.value.data.length : prev.companies,
          products: productsRes.status === 'fulfilled' ? productsRes.value.total : prev.products,
          tracked_urls: urlsRes.status === 'fulfilled' ? urlsRes.value.total : prev.tracked_urls,
        }));
      } catch { /* keep zeros */ }
    }

    if (runsRes.status === 'fulfilled') {
      setRecentRuns(runsRes.value.data);
    } else {
      console.error('Sync runs failed:', runsRes.reason);
    }

    if (errorsRes.status === 'fulfilled') {
      setErrors(errorsRes.value.data);
    } else {
      console.error('Errors fetch failed:', errorsRes.reason);
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      await scraperApi.runAll();
      toast.success('Full scrape started');
      setTimeout(load, 2000);
    } catch {
      toast.error('Failed to start scrape');
    } finally {
      setRunningAll(false);
    }
  };

  const formatRelTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const formatDuration = (run: SyncRun) => {
    if (!run.finished_at) return null;
    const ms = new Date(run.finished_at).getTime() - new Date(run.started_at).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return 'bg-green-50 text-green-700';
    if (s === 'running') return 'bg-blue-50 text-blue-700';
    if (s === 'failed') return 'bg-red-50 text-red-700';
    return 'bg-amber-50 text-amber-700';
  };

  const syncRate = stats.last_sync_total > 0
    ? Math.round((stats.last_sync_succeeded / stats.last_sync_total) * 100)
    : stats.last_sync_rate;

  const statCards = [
    { label: 'COMPANIES', value: loading ? '—' : String(stats.companies), subtitle: 'Active marketplaces', icon: Building2 },
    { label: 'PRODUCTS', value: loading ? '—' : String(stats.products), subtitle: 'In reference catalog', icon: Package },
    { label: 'TRACKED URLS', value: loading ? '—' : String(stats.tracked_urls), subtitle: 'Active URL mappings', icon: LinkIcon },
    { label: 'LAST SYNC RATE', value: loading ? '—' : `${syncRate}%`, subtitle: `${stats.last_sync_succeeded}/${stats.last_sync_total} succeeded`, icon: RefreshCw },
  ];

  const quickItems = [
    { title: 'Latest Prices', description: 'Live price board — one price per product per store', icon: TrendingUp, path: '/monitoring' },
    { title: 'Product URLs', description: 'Manage & scrape store URLs being tracked', icon: LinkIcon, path: '/monitoring' },
    { title: 'Sync Runs', description: 'Scraper execution history & per-company runs', icon: RefreshCw, path: '/monitoring' },
    { title: 'Products', description: 'Reference catalog — your internal product list', icon: Package, path: '/products' },
    { title: 'Companies', description: 'Monitored marketplaces & scraper config', icon: Building2, path: '/companies' },
    { title: 'Auto-Discover', description: 'Find product URLs on any store automatically', icon: Sparkles, path: '/discovering' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Home</h1>
              <p className="text-sm text-muted-foreground">
                Price monitoring across {stats.companies} companies · {stats.tracked_urls} active tracked URLs
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={handleRunAll}
                disabled={runningAll}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-60"
              >
                {runningAll ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span className="text-sm font-medium">Run All</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xs font-medium text-muted-foreground tracking-wide">{stat.label}</div>
                  <div className="bg-gray-100 text-gray-700 p-2 rounded-lg">
                    <stat.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-semibold mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <h2 className="text-base font-semibold mb-1">
              Quick Access <span className="text-sm font-normal text-muted-foreground">— jump to any section directly</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 mb-8">
            {quickItems.map((item) => (
              <button
                key={item.title}
                onClick={() => navigate(item.path)}
                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group hover:border-gray-200"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-gray-100 text-gray-700 p-3 rounded-xl">
                    <item.icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Sync Runs */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Recent Sync Runs</h3>
                </div>
                <button onClick={() => navigate('/monitoring')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View all →
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {recentRuns.length === 0 && !loading && (
                  <div className="px-6 py-8 text-sm text-muted-foreground text-center">No sync runs yet</div>
                )}
                {recentRuns.map((run) => (
                  <div key={run.id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor(run.status)}`}>
                          {run.status}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {run.run_type === 'full_batch' ? 'Full Batch' : run.run_type === 'selected_batch' ? 'Selected Batch' : run.company_name || 'Single URL'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelTime(run.started_at)}{formatDuration(run) ? ` · ${formatDuration(run)}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">{run.total_checked}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="text-green-600">{run.success_count}✓</span>
                        {run.fail_count > 0 && <span className="text-red-500 ml-1">{run.fail_count}✗</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Scrape Errors */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-sm">Recent Scrape Errors</h3>
                </div>
                <button onClick={() => navigate('/monitoring')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View prices →
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {errors.length === 0 && !loading && (
                  <div className="px-6 py-8 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm font-medium text-green-700">All clean</p>
                    <p className="text-xs text-muted-foreground">No recent scrape errors</p>
                  </div>
                )}
                {errors.map((snap) => (
                  <div key={snap.id} className="px-6 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{snap.internal_name}</p>
                        <p className="text-xs text-muted-foreground">{snap.company_name} · {formatRelTime(snap.checked_at)}</p>
                        {snap.error_message && (
                          <p className="text-xs text-red-500 truncate mt-0.5">{snap.error_message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
