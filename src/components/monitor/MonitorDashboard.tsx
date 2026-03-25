import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Package,
  Link2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
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
    completed: "dark:bg-emerald-500/15 bg-emerald-100 dark:text-emerald-400 text-emerald-700 dark:border-emerald-500/30 border-emerald-200",
    success:   "dark:bg-emerald-500/15 bg-emerald-100 dark:text-emerald-400 text-emerald-700 dark:border-emerald-500/30 border-emerald-200",
    running:   "dark:bg-blue-500/15 bg-blue-100 dark:text-blue-400 text-blue-700 dark:border-blue-500/30 border-blue-200",
    partial:   "dark:bg-amber-500/15 bg-amber-100 dark:text-amber-400 text-amber-700 dark:border-amber-500/30 border-amber-200",
    failed:    "dark:bg-red-500/15 bg-red-100 dark:text-red-400 text-red-700 dark:border-red-500/30 border-red-200",
    error:     "dark:bg-red-500/15 bg-red-100 dark:text-red-400 text-red-700 dark:border-red-500/30 border-red-200",
    timeout:   "dark:bg-amber-500/15 bg-amber-100 dark:text-amber-400 text-amber-700 dark:border-amber-500/30 border-amber-200",
    no_price:  "dark:bg-zinc-500/15 bg-zinc-100 dark:text-zinc-400 text-zinc-600 dark:border-zinc-500/30 border-zinc-200",
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
    <div className="rounded-2xl p-5 dark:bg-gradient-to-br dark:from-[#12121C] dark:to-[#16162A] bg-white border dark:border-primary/20 border-primary/15"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">{label}</span>
        <div className="w-8 h-8 rounded-xl dark:bg-primary/15 bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 dark:text-primary text-primary" />
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight dark:text-white text-foreground">{value}</div>
      {sub && <p className="mt-1 text-xs dark:text-muted-foreground text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Quick Access Card ──────────────────────────────────────────────

interface QuickCard {
  label: string;
  description: string;
  icon: React.ElementType;
  gradient: string;        // Tailwind gradient classes for icon bg
  iconColor: string;       // icon color class
  badge?: string | number; // optional count badge
  page: Page;
  subTab?: "urls" | "prices" | "syncs";
  action?: () => void;     // if set, call instead of navigate
  isAction?: boolean;      // renders as action (no arrow)
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
      className="group relative text-left rounded-2xl p-4 dark:bg-gradient-to-br dark:from-[#12121C] dark:to-[#16162A] bg-white border dark:border-white/[0.06] border-border/60 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl dark:hover:border-primary/40 hover:border-primary/25 active:scale-[0.99] w-full"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.gradient}`}>
          <card.icon className={`h-5 w-5 ${card.iconColor}`} />
        </div>
        {card.badge !== undefined && (
          <span className="text-xs font-bold dark:bg-white/[0.06] bg-muted/60 dark:text-muted-foreground text-muted-foreground px-2 py-0.5 rounded-full">
            {card.badge}
          </span>
        )}
      </div>

      {/* Label + description */}
      <p className="font-semibold text-sm dark:text-white text-foreground leading-snug">{card.label}</p>
      <p className="mt-0.5 text-xs dark:text-muted-foreground text-muted-foreground leading-snug">{card.description}</p>

      {/* Arrow indicator */}
      {!card.isAction && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
          <ArrowRight className="h-4 w-4 dark:text-primary text-primary" />
        </div>
      )}

      {/* Subtle glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(110,118,255,0.06), transparent 70%)" }} />
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
      gradient: "bg-gradient-to-br from-violet-500/20 to-primary/30 dark:from-violet-500/25 dark:to-primary/20",
      iconColor: "dark:text-violet-400 text-violet-600",
      badge: loading ? "…" : stats.prices,
      page: "monitor-monitoring",
      subTab: "prices",
    },
    {
      label: "Product URLs",
      description: "Manage & scrape store URLs being tracked",
      icon: Link2,
      gradient: "bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-500/25 dark:to-indigo-500/20",
      iconColor: "dark:text-blue-400 text-blue-600",
      badge: loading ? "…" : stats.urls,
      page: "monitor-monitoring",
      subTab: "urls",
    },
    {
      label: "Sync Runs",
      description: "Scraper execution history & per-company runs",
      icon: History,
      gradient: "bg-gradient-to-br from-sky-500/20 to-cyan-500/20 dark:from-sky-500/25 dark:to-cyan-500/20",
      iconColor: "dark:text-sky-400 text-sky-600",
      page: "monitor-monitoring",
      subTab: "syncs",
    },
    {
      label: "Products",
      description: "Reference catalog — your internal product list",
      icon: Package,
      gradient: "bg-gradient-to-br from-amber-500/20 to-orange-500/15 dark:from-amber-500/25 dark:to-orange-500/15",
      iconColor: "dark:text-amber-400 text-amber-600",
      badge: loading ? "…" : stats.products,
      page: "monitor-products",
    },
    {
      label: "Companies",
      description: "Monitored marketplaces & scraper config",
      icon: Building2,
      gradient: "bg-gradient-to-br from-emerald-500/20 to-teal-500/15 dark:from-emerald-500/25 dark:to-teal-500/15",
      iconColor: "dark:text-emerald-400 text-emerald-600",
      badge: loading ? "…" : stats.companies,
      page: "monitor-companies",
    },
    {
      label: "Auto-Discover",
      description: "Find product URLs on any store automatically",
      icon: Sparkles,
      gradient: "bg-gradient-to-br from-pink-500/20 to-rose-500/15 dark:from-pink-500/25 dark:to-rose-500/15",
      iconColor: "dark:text-pink-400 text-pink-600",
      page: "monitor-monitoring",
      subTab: "urls",
    },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white text-foreground">Home</h1>
          <p className="mt-1 text-sm dark:text-muted-foreground text-muted-foreground">
            Price monitoring across {loading ? "…" : stats.companies} companies · {loading ? "…" : stats.urls} active tracked URLs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="rounded-xl gap-2 dark:border-primary/30 border-primary/20">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={handleRunAll} disabled={runningAll}
            className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-white">
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
          <h2 className="text-base font-semibold dark:text-white text-foreground">Quick Access</h2>
          <span className="text-xs dark:text-muted-foreground text-muted-foreground">— jump to any section directly</span>
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
        <div className="rounded-2xl dark:bg-gradient-to-br dark:from-[#12121C] dark:to-[#16162A] bg-white border dark:border-primary/20 border-primary/15 overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/5 border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 dark:text-primary text-primary" />
              <span className="text-sm font-semibold dark:text-white text-foreground">Recent Sync Runs</span>
            </div>
            <button onClick={() => onNavigate("monitor-monitoring", "syncs")}
              className="text-xs dark:text-primary/70 text-primary/70 hover:dark:text-primary hover:text-primary flex items-center gap-0.5 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y dark:divide-white/5 divide-border">
            {loading ? (
              <div className="px-5 py-8 text-center text-sm dark:text-muted-foreground text-muted-foreground">Loading…</div>
            ) : recentRuns.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm dark:text-muted-foreground text-muted-foreground">No sync runs yet</div>
            ) : (
              recentRuns.map(run => (
                <div key={run.id} className="px-5 py-3 flex items-center justify-between gap-3 dark:hover:bg-white/[0.02] hover:bg-muted/20 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} />
                      <span className="text-xs dark:text-muted-foreground text-muted-foreground capitalize">
                        {run.run_type.replace("_", " ")}
                        {run.company_name ? ` · ${run.company_name}` : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs dark:text-muted-foreground text-muted-foreground">
                      {formatRelative(run.started_at)} · {formatDuration(run.started_at, run.finished_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold dark:text-white text-foreground">{run.total_checked}</p>
                    <p className="text-[11px] dark:text-muted-foreground text-muted-foreground">
                      <span className="dark:text-emerald-400 text-emerald-600">{run.success_count}✓</span>
                      {run.fail_count > 0 && <span className="dark:text-red-400 text-red-500 ml-1">{run.fail_count}✗</span>}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Errors */}
        <div className="rounded-2xl dark:bg-gradient-to-br dark:from-[#12121C] dark:to-[#16162A] bg-white border dark:border-primary/20 border-primary/15 overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/5 border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 dark:text-amber-400 text-amber-500" />
              <span className="text-sm font-semibold dark:text-white text-foreground">Recent Scrape Errors</span>
            </div>
            <button onClick={() => onNavigate("monitor-monitoring", "prices")}
              className="text-xs dark:text-primary/70 text-primary/70 hover:dark:text-primary hover:text-primary flex items-center gap-0.5 transition-colors">
              View prices <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y dark:divide-white/5 divide-border">
            {loading ? (
              <div className="px-5 py-8 text-center text-sm dark:text-muted-foreground text-muted-foreground">Loading…</div>
            ) : failedSnaps.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 className="h-9 w-9 dark:text-emerald-400 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium dark:text-emerald-400 text-emerald-600">All clean</p>
                <p className="text-xs dark:text-muted-foreground text-muted-foreground mt-0.5">No recent scrape errors</p>
              </div>
            ) : (
              failedSnaps.map(snap => (
                <div key={snap.id} className="px-5 py-3 dark:hover:bg-white/[0.02] hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium dark:text-white text-foreground truncate">{snap.internal_name}</p>
                      <p className="text-xs dark:text-muted-foreground text-muted-foreground">{snap.company_name}</p>
                    </div>
                    <StatusBadge status={snap.scrape_status} />
                  </div>
                  {snap.error_message && (
                    <p className="mt-1 text-[11px] dark:text-red-400 text-red-500 truncate">{snap.error_message}</p>
                  )}
                  <p className="mt-0.5 text-[11px] dark:text-muted-foreground text-muted-foreground">
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
