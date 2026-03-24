import { useEffect, useState, useCallback, Fragment } from "react";
import { RotateCw, Play, Building2, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner@2.0.3";
import {
  syncRunsApi,
  companiesApi,
  scraperApi,
  type SyncRun,
  type Company,
} from "../../lib/monitorApi";

// ── Helpers ────────────────────────────────────────────────────────

function formatDuration(start: string, end: string | null) {
  if (!end) return "running…";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "dark:bg-emerald-500/15 bg-emerald-100 dark:text-emerald-400 text-emerald-700 dark:border-emerald-500/30 border-emerald-200",
    running:   "dark:bg-blue-500/15 bg-blue-100 dark:text-blue-400 text-blue-700 dark:border-blue-500/30 border-blue-200",
    partial:   "dark:bg-amber-500/15 bg-amber-100 dark:text-amber-400 text-amber-700 dark:border-amber-500/30 border-amber-200",
    failed:    "dark:bg-red-500/15 bg-red-100 dark:text-red-400 text-red-700 dark:border-red-500/30 border-red-200",
  };
  const icon: Record<string, string> = {
    completed: "●", running: "◌", partial: "◑", failed: "✕",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${map[status] ?? map.failed}`}>
      <span className="text-[10px]">{icon[status] ?? "●"}</span>
      {status}
    </span>
  );
}

function RunTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    single_url:    "Single URL",
    company_batch: "Company",
    full_batch:    "Full",
  };
  return (
    <span className="inline-flex px-2 py-0.5 rounded-md text-xs dark:bg-primary/10 bg-primary/5 dark:text-primary text-primary dark:border-primary/20 border-primary/15 border font-medium">
      {labels[type] ?? type}
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export function SyncRunsPage() {
  const [runs,      setRuns]      = useState<SyncRun[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [runningAll, setRunningAll]   = useState(false);
  const [runningComp, setRunningComp] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [expanded, setExpanded]   = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [runsRes, compRes] = await Promise.all([
        syncRunsApi.list({ status: filterStatus || undefined, limit: 50 }),
        companiesApi.list(true),
      ]);
      setRuns(runsRes.data as SyncRun[]);
      setCompanies(compRes.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  // Poll every 5s while any run is "running"
  useEffect(() => {
    const hasRunning = runs.some(r => r.status === "running");
    if (!hasRunning) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [runs, load]);

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      await scraperApi.runAll();
      toast.success("Full sync started — polling for updates…");
      setTimeout(load, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start";
      toast.error(msg);
    } finally {
      setRunningAll(false);
    }
  };

  const handleRunCompany = async (company: Company) => {
    setRunningComp(company.id);
    try {
      await scraperApi.runCompany(company.id);
      toast.success(`Scrape started for ${company.name}`);
      setTimeout(load, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start";
      toast.error(msg);
    } finally {
      setRunningComp(null);
    }
  };

  const selectCls = "rounded-xl px-3 py-2 text-sm dark:bg-[#1A1A2E] bg-muted/50 border dark:border-white/10 border-border dark:text-white text-foreground focus:outline-none focus:ring-1 dark:focus:ring-primary/50 focus:ring-primary/30";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white text-foreground">Sync Runs</h1>
          <p className="mt-1 text-sm dark:text-muted-foreground text-muted-foreground">
            Scraper execution history
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

      {/* Quick company run + filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className={selectCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="partial">Partial</option>
          <option value="failed">Failed</option>
        </select>

        {/* Run per-company buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {companies.slice(0, 5).map(c => (
            <Button key={c.id} variant="outline" size="sm"
              disabled={runningComp === c.id}
              onClick={() => handleRunCompany(c)}
              className="rounded-xl gap-1.5 text-xs h-8 dark:border-primary/30 border-primary/20 dark:hover:bg-primary/10 hover:bg-primary/5">
              <Play className="h-3 w-3" />
              {runningComp === c.id ? "Starting…" : c.name}
            </Button>
          ))}
          {companies.length > 5 && (
            <span className="text-xs dark:text-muted-foreground text-muted-foreground">+{companies.length - 5} more</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl dark:bg-gradient-to-br dark:from-[#12121C] dark:to-[#16162A] bg-white border dark:border-primary/20 border-primary/15 overflow-hidden"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-white/5 border-border">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Type</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden sm:table-cell">Company</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden md:table-cell">Started</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden md:table-cell">Duration</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Checked</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">✓ / ✗</th>
                <th className="px-5 py-3.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5 divide-border">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center dark:text-muted-foreground text-muted-foreground">Loading…</td></tr>
              ) : runs.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center dark:text-muted-foreground text-muted-foreground">
                  <RotateCw className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No sync runs yet — press "Run All" to start
                </td></tr>
              ) : (
                runs.map(run => (
                  <Fragment key={run.id}>
                    <tr
                      className="dark:hover:bg-white/[0.02] hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === run.id ? null : run.id)}>
                      <td className="px-5 py-3.5"><StatusBadge status={run.status} /></td>
                      <td className="px-5 py-3.5"><RunTypeBadge type={run.run_type} /></td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className="dark:text-muted-foreground text-muted-foreground text-xs">
                          {run.company_name ?? "All"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="text-xs dark:text-muted-foreground text-muted-foreground whitespace-nowrap">
                          {formatDate(run.started_at)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="text-xs dark:text-muted-foreground text-muted-foreground">
                          {formatDuration(run.started_at, run.finished_at)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-semibold dark:text-white text-foreground">{run.total_checked}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="dark:text-emerald-400 text-emerald-600 font-medium">{run.success_count}</span>
                        <span className="dark:text-muted-foreground text-muted-foreground mx-1">/</span>
                        <span className={run.fail_count > 0 ? "dark:text-red-400 text-red-500 font-medium" : "dark:text-muted-foreground text-muted-foreground"}>
                          {run.fail_count}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <ChevronDown className={`h-4 w-4 dark:text-muted-foreground text-muted-foreground transition-transform ${expanded === run.id ? "rotate-180" : ""}`} />
                      </td>
                    </tr>
                    {expanded === run.id && (
                      <tr className="dark:bg-white/[0.01] bg-muted/10">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="dark:text-muted-foreground text-muted-foreground mb-1">Run ID</p>
                              <p className="dark:text-white text-foreground font-mono">#{run.id}</p>
                            </div>
                            <div>
                              <p className="dark:text-muted-foreground text-muted-foreground mb-1">Triggered By</p>
                              <p className="dark:text-white text-foreground capitalize">{run.triggered_by}</p>
                            </div>
                            <div>
                              <p className="dark:text-muted-foreground text-muted-foreground mb-1">Finished</p>
                              <p className="dark:text-white text-foreground">{run.finished_at ? formatDate(run.finished_at) : "—"}</p>
                            </div>
                            <div>
                              <p className="dark:text-muted-foreground text-muted-foreground mb-1">Success Rate</p>
                              <p className="dark:text-white text-foreground font-semibold">
                                {run.total_checked > 0
                                  ? `${Math.round((run.success_count / run.total_checked) * 100)}%`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          {run.error_message && (
                            <div className="mt-3 p-2 rounded-lg dark:bg-red-500/10 bg-red-50 border dark:border-red-500/20 border-red-200">
                              <p className="text-xs dark:text-red-400 text-red-600">{run.error_message}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
