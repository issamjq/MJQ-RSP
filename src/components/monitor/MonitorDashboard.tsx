import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Package,
  Link2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Activity,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
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
    out_of_stock: "dark:bg-orange-500/15 bg-orange-100 dark:text-orange-400 text-orange-700",
  };
  const cls = map[status] || "dark:bg-zinc-500/15 bg-zinc-100 dark:text-zinc-400 text-zinc-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, sub }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 dark:bg-gradient-to-br dark:from-[#12121C] dark:to-[#16162A] bg-gradient-to-br from-white to-[#fafafa] border dark:border-primary/20 border-primary/15"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(139,92,246,0.08)" }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium dark:text-muted-foreground text-muted-foreground">{label}</span>
        <div className="w-9 h-9 rounded-xl dark:bg-primary/15 bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 dark:text-primary text-primary" />
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight dark:text-white text-foreground">{value}</div>
      {sub && <p className="mt-1.5 text-xs dark:text-muted-foreground text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────

export function MonitorDashboard() {
  const [stats, setStats] = useState({ companies: 0, products: 0, urls: 0 });
  const [recentRuns, setRecentRuns] = useState<SyncRun[]>([]);
  const [failedSnaps, setFailedSnaps] = useState<PriceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesRes, productsRes, urlsRes, runsRes, failedRes] = await Promise.all([
        companiesApi.list(),
        productsApi.list({ limit: 1 }),
        urlsApi.list({ limit: 1, is_active: true }),
        syncRunsApi.list({ limit: 8 }),
        snapshotsApi.list({ scrape_status: "error", limit: 6 }),
      ]);

      setStats({
        companies: companiesRes.data.length,
        products:  productsRes.total,
        urls:      urlsRes.total,
      });
      setRecentRuns(runsRes.data as SyncRun[]);
      setFailedSnaps(failedRes.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard";
      toast.error(msg);
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
      setTimeout(() => load(), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start sync";
      toast.error(msg);
    } finally {
      setRunningAll(false);
    }
  };

  const lastRun = recentRuns[0];
  const successRate = lastRun && lastRun.total_checked > 0
    ? Math.round((lastRun.success_count / lastRun.total_checked) * 100)
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white text-foreground">
            Price Monitor
          </h1>
          <p className="mt-1 text-sm dark:text-muted-foreground text-muted-foreground">
            UAE product price tracking across {stats.companies} companies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="rounded-xl gap-2 dark:border-primary/30 border-primary/20 dark:hover:bg-primary/10 hover:bg-primary/5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleRunAll}
            disabled={runningAll}
            className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-white"
          >
            <Play className="h-4 w-4" />
            {runningAll ? "Starting…" : "Run All Scrapers"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active Companies" value={loading ? "—" : stats.companies} icon={Building2} sub="Monitored marketplaces" />
        <StatCard label="Internal Products" value={loading ? "—" : stats.products} icon={Package} sub="In catalog" />
        <StatCard label="Tracked URLs" value={loading ? "—" : stats.urls} icon={Link2} sub="Active mappings" />
        <StatCard
          label="Last Sync Rate"
          value={loading || successRate === null ? "—" : `${successRate}%`}
          icon={Activity}
          sub={lastRun ? `${lastRun.success_count}/${lastRun.total_checked} succeeded` : "No runs yet"}
        />
      </div>

      {/* Bottom grid: recent runs + failed snaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Sync Runs */}
        <div
          className="rounded-2xl dark:bg-gradient-to-br dark:from-[#12121C] dark:to-[#16162A] bg-white border dark:border-primary/20 border-primary/15 overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/5 border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 dark:text-primary text-primary" />
              <span className="text-sm font-semibold dark:text-white text-foreground">Recent Sync Runs</span>
            </div>
          </div>
          <div className="divide-y dark:divide-white/5 divide-border">
            {loading ? (
              <div className="px-5 py-8 text-center text-sm dark:text-muted-foreground text-muted-foreground">Loading…</div>
            ) : recentRuns.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm dark:text-muted-foreground text-muted-foreground">No sync runs yet</div>
            ) : (
              recentRuns.map((run) => (
                <div key={run.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} />
                      <span className="text-xs dark:text-muted-foreground text-muted-foreground capitalize">
                        {run.run_type.replace("_", " ")}
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
        <div
          className="rounded-2xl dark:bg-gradient-to-br dark:from-[#12121C] dark:to-[#16162A] bg-white border dark:border-primary/20 border-primary/15 overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b dark:border-white/5 border-border">
            <AlertTriangle className="h-4 w-4 dark:text-red-400 text-red-500" />
            <span className="text-sm font-semibold dark:text-white text-foreground">Recent Scrape Errors</span>
          </div>
          <div className="divide-y dark:divide-white/5 divide-border">
            {loading ? (
              <div className="px-5 py-8 text-center text-sm dark:text-muted-foreground text-muted-foreground">Loading…</div>
            ) : failedSnaps.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 dark:text-emerald-400 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm dark:text-muted-foreground text-muted-foreground">No recent errors</p>
              </div>
            ) : (
              failedSnaps.map((snap) => (
                <div key={snap.id} className="px-5 py-3">
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
