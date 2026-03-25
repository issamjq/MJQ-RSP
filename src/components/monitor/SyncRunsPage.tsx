import { useEffect, useState, useCallback, Fragment } from "react";
import { RotateCw, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner@2.0.3";
import {
  syncRunsApi,
  scraperApi,
  type SyncRun,
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
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    running:   "bg-blue-100 text-blue-700 border-blue-200",
    partial:   "bg-amber-100 text-amber-700 border-amber-200",
    failed:    "bg-red-100 text-red-700 border-red-200",
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
    <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-700 border border-gray-200 font-medium">
      {labels[type] ?? type}
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export function SyncRunsPage() {
  const [runs,    setRuns]    = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [expanded, setExpanded]    = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const runsRes = await syncRunsApi.list({ limit: 50 });
      setRuns(runsRes.data as SyncRun[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load";
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
      toast.success("Full sync started — polling for updates…");
      setTimeout(load, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start";
      toast.error(msg);
    } finally {
      setRunningAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sync Runs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scraper execution history
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Company</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Started</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Duration</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Checked</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase">✓ / ✗</th>
                <th className="px-6 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : runs.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                  <RotateCw className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No sync runs yet — press "Run All" to start
                </td></tr>
              ) : (
                runs.map(run => (
                  <Fragment key={run.id}>
                    <tr
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === run.id ? null : run.id)}>
                      <td className="px-6 py-4"><StatusBadge status={run.status} /></td>
                      <td className="px-6 py-4"><RunTypeBadge type={run.run_type} /></td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-muted-foreground text-xs">
                          {run.company_name ?? "All"}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(run.started_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(run.started_at, run.finished_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-foreground">{run.total_checked}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-emerald-600 font-medium">{run.success_count}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className={run.fail_count > 0 ? "text-red-500 font-medium" : "text-muted-foreground"}>
                          {run.fail_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded === run.id ? "rotate-180" : ""}`} />
                      </td>
                    </tr>
                    {expanded === run.id && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-muted-foreground mb-1">Run ID</p>
                              <p className="text-foreground font-mono">#{run.id}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Triggered By</p>
                              <p className="text-foreground capitalize">{run.triggered_by}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Finished</p>
                              <p className="text-foreground">{run.finished_at ? formatDate(run.finished_at) : "—"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Success Rate</p>
                              <p className="text-foreground font-semibold">
                                {run.total_checked > 0
                                  ? `${Math.round((run.success_count / run.total_checked) * 100)}%`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          {run.error_message && (
                            <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200">
                              <p className="text-xs text-red-600">{run.error_message}</p>
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
