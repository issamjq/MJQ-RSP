import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Package,
  Link2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  BarChart2,
  History,
  ArrowRight,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner@2.0.3";
import {
  companiesApi,
  productsApi,
  urlsApi,
  syncRunsApi,
  snapshotsApi,
  scraperApi,
  type SyncRun,
  type PriceSnapshot,
} from "../../lib/monitorApi";
import type { Page } from "../ModernSidebar";

// ── Helpers ────────────────────────────────────────────────────────

function formatDuration(start: string, end: string | null) {
  if (!end) return "running…";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    success:   "bg-emerald-100 text-emerald-700 border-emerald-200",
    running:   "bg-blue-100 text-blue-700 border-blue-200",
    partial:   "bg-amber-100 text-amber-700 border-amber-200",
    failed:    "bg-red-100 text-red-700 border-red-200",
    error:     "bg-red-100 text-red-700 border-red-200",
    timeout:   "bg-amber-100 text-amber-700 border-amber-200",
    no_price:  "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${map[status] ?? map.no_price}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, sub }: {
  label: string; value: string | number; icon: React.ElementType; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-gray-700" />
        </div>
      </div>
      <div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Quick Access Card ──────────────────────────────────────────────

interface QuickCard {
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string | number;
  page: Page;
  subTab?: "urls" | "prices" | "syncs";
  action?: () => void;
  isAction?: boolean;
}

function QuickAccessCard({
  card,
  onNavigate,
}: {
  card: QuickCard;
  onNavigate: (page: Page, subTab?: string) => void;
}) {
  const handleClick = () => {
    if (card.action) { card.action(); return; }
    onNavigate(card.page, card.subTab);
  };

  return (
    <button
      onClick={handleClick}
      className="group relative text-left rounded-xl p-4 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 w-full"
    >
      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <card.icon className="h-5 w-5 text-gray-700" />
        </div>
        {card.badge !== undefined && (
          <span className="text-xs font-bold bg-gray-100 text-muted-foreground px-2 py-0.5 rounded-full">
            {card.badge}
          </span>
        )}
      </div>

      {/* Label + description */}
      <p className="font-semibold text-sm text-foreground leading-snug">{card.label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{card.description}</p>

      {/* Arrow indicator */}
      {!card.isAction && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </div>
      )}
    </button>
  );
}

// ── Component ──────────────────────────────────────────────────────

interface MonitorDashboardProps {
  onNavigate: (page: Page, subTab?: string) => void;
}

export function MonitorDashboard({ onNavigate }: MonitorDashboardProps) {
  const [stats, setStats]           = useState({ companies: 0, products: 0, urls: 0, prices: 0 });
  const [recentRuns, setRecentRuns] = useState<SyncRun[]>([]);
  const [failedSnaps, setFailedSnaps] = useState<PriceSnapshot[]>([]);
  const [loading, setLoading]       = useState(true);
  const [runningAll, setRunningAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesRes, productsRes, urlsRes, runsRes, failedRes, latestRes] = await Promise.all([
        companiesApi.list(),
        productsApi.list({ limit: 1 }),
        urlsApi.list({ limit: 1, is_active: true }),
        syncRunsApi.list({ limit: 6 }),
        snapshotsApi.list({ scrape_status: "error", limit: 5 }),
        snapshotsApi.latest(),
      ]);
      setStats({
        companies: companiesRes.data.length,
        products:  productsRes.total,
        urls:      urlsRes.total,
        prices:    latestRes.data.length,
      });
      setRecentRuns(runsRes.data as SyncRun[]);
      setFailedSnaps(failedRes.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      await scraperApi.runAll();
      toast.success("Full sync started — check Sync Runs for progress");
      setTimeout(load, 2000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start sync");
    } finally {
      setRunningAll(false);
    }
  };

  const lastRun   = recentRuns[0];
  const successRate = lastRun && lastRun.total_checked > 0
    ? Math.round((lastRun.success_count / lastRun.total_checked) * 100)
    : null;

  const quickCards: QuickCard[] = [
    {
      label: "Latest Prices",
      description: "Live price board — one price per product per store",
      icon: BarChart2,
      badge: loading ? "…" : stats.prices,
      page: "monitor-monitoring",
      subTab: "prices",
    },
    {
      label: "Product URLs",
      description: "Manage & scrape store URLs being tracked",
      icon: Link2,
      badge: loading ? "…" : stats.urls,
      page: "monitor-monitoring",
      subTab: "urls",
    },
    {
      label: "Sync Runs",
      description: "Scraper execution history & per-company runs",
      icon: History,
      page: "monitor-monitoring",
      subTab: "syncs",
    },
    {
      label: "Products",
      description: "Reference catalog — your internal product list",
      icon: Package,
      badge: loading ? "…" : stats.products,
      page: "monitor-products",
    },
    {
      label: "Companies",
      description: "Monitored marketplaces & scraper config",
      icon: Building2,
      badge: loading ? "…" : stats.companies,
      page: "monitor-companies",
    },
    {
      label: "Auto-Discover",
      description: "Find product URLs on any store automatically",
      icon: Sparkles,
      page: "monitor-monitoring",
      subTab: "urls",
    },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Home</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Price monitoring across {loading ? "…" : stats.companies} companies · {loading ? "…" : stats.urls} active tracked URLs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="rounded-lg gap-2 border-gray-200 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={handleRunAll} disabled={runningAll}
            className="rounded-lg gap-2 bg-black text-white hover:bg-gray-800">
            <RotateCw className={`h-4 w-4 ${runningAll ? "animate-spin" : ""}`} />
            {runningAll ? "Starting…" : "Run All"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Companies"    value={loading ? "—" : stats.companies} icon={Building2} sub="Active marketplaces" />
        <StatCard label="Products"     value={loading ? "—" : stats.products}  icon={Package}   sub="In reference catalog" />
        <StatCard label="Tracked URLs" value={loading ? "—" : stats.urls}      icon={Link2}     sub="Active URL mappings" />
        <StatCard
          label="Last Sync Rate"
          value={loading || successRate === null ? "—" : `${successRate}%`}
          icon={Activity}
          sub={lastRun ? `${lastRun.success_count}/${lastRun.total_checked} succeeded` : "No runs yet"}
        />
      </div>

      {/* Quick Access */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-foreground">Quick Access</h2>
          <span className="text-xs text-muted-foreground">— jump to any section directly</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {quickCards.map(card => (
            <QuickAccessCard key={card.label} card={card} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {/* Bottom: Recent runs + Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Sync Runs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-foreground">Recent Sync Runs</span>
            </div>
            <button onClick={() => onNavigate("monitor-monitoring", "syncs")}
              className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : recentRuns.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No sync runs yet</div>
            ) : (
              recentRuns.map(run => (
                <div key={run.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {run.run_type.replace("_", " ")}
                        {run.company_name ? ` · ${run.company_name}` : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelative(run.started_at)} · {formatDuration(run.started_at, run.finished_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{run.total_checked}</p>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="text-emerald-600">{run.success_count}✓</span>
                      {run.fail_count > 0 && <span className="text-red-500 ml-1">{run.fail_count}✗</span>}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Errors */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">Recent Scrape Errors</span>
            </div>
            <button onClick={() => onNavigate("monitor-monitoring", "prices")}
              className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5 transition-colors">
              View prices <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : failedSnaps.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 className="h-9 w-9 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald-600">All clean</p>
                <p className="text-xs text-muted-foreground mt-0.5">No recent scrape errors</p>
              </div>
            ) : (
              failedSnaps.map(snap => (
                <div key={snap.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{snap.internal_name}</p>
                      <p className="text-xs text-muted-foreground">{snap.company_name}</p>
                    </div>
                    <StatusBadge status={snap.scrape_status} />
                  </div>
                  {snap.error_message && (
                    <p className="mt-1 text-[11px] text-red-500 truncate">{snap.error_message}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatRelative(snap.checked_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
