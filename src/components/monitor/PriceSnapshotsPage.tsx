import { useEffect, useState, useCallback } from "react";
import { BarChart2, RefreshCw, TrendingDown, TrendingUp, Minus, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner@2.0.3";
import {
  snapshotsApi,
  companiesApi,
  productsApi,
  type PriceSnapshot,
  type Company,
  type Product,
} from "../../lib/monitorApi";

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AvailBadge({ avail }: { avail: string }) {
  if (avail === "in_stock")     return <span className="text-xs dark:text-emerald-400 text-emerald-600 font-medium">In Stock</span>;
  if (avail === "out_of_stock") return <span className="text-xs dark:text-red-400 text-red-500 font-medium">Out of Stock</span>;
  return <span className="text-xs dark:text-muted-foreground text-muted-foreground">{avail || "—"}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success:  "dark:bg-emerald-500/15 bg-emerald-100 dark:text-emerald-400 text-emerald-700 dark:border-emerald-500/30 border-emerald-200",
    error:    "dark:bg-red-500/15 bg-red-100 dark:text-red-400 text-red-700 dark:border-red-500/30 border-red-200",
    timeout:  "dark:bg-amber-500/15 bg-amber-100 dark:text-amber-400 text-amber-700 dark:border-amber-500/30 border-amber-200",
    no_price: "dark:bg-zinc-500/15 bg-zinc-100 dark:text-zinc-400 text-zinc-600 dark:border-zinc-500/30 border-zinc-200",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${map[status] ?? map.no_price}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

type TabMode = "latest" | "all";

export function PriceSnapshotsPage() {
  const [snapshots,  setSnapshots]  = useState<PriceSnapshot[]>([]);
  const [total,      setTotal]      = useState(0);
  const [companies,  setCompanies]  = useState<Company[]>([]);
  const [products,   setProducts]   = useState<Product[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<TabMode>("latest");
  const [filterComp, setFilterComp] = useState("");
  const [filterProd, setFilterProd] = useState("");
  const [page,       setPage]       = useState(1);

  const LIMIT = 30;

  const loadRefs = useCallback(async () => {
    const [comp, prod] = await Promise.all([
      companiesApi.list(true),
      productsApi.list({ limit: 200 }),
    ]);
    setCompanies(comp.data);
    setProducts(prod.data);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "latest") {
        const res = await snapshotsApi.latest({
          company_id: filterComp ? parseInt(filterComp) : undefined,
          product_id: filterProd ? parseInt(filterProd) : undefined,
        });
        setSnapshots(res.data);
        setTotal(res.data.length);
      } else {
        const res = await snapshotsApi.list({
          company_id: filterComp ? parseInt(filterComp) : undefined,
          product_id: filterProd ? parseInt(filterProd) : undefined,
          page,
          limit: LIMIT,
        });
        setSnapshots(res.data);
        setTotal(res.total);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [tab, filterComp, filterProd, page]);

  useEffect(() => { loadRefs(); }, [loadRefs]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab, filterComp, filterProd]);

  const totalPages = Math.ceil(total / LIMIT);

  const selectCls = "rounded-xl px-3 py-2 text-sm dark:bg-[#1A1A2E] bg-muted/50 border dark:border-white/10 border-border dark:text-white text-foreground focus:outline-none focus:ring-1 dark:focus:ring-primary/50 focus:ring-primary/30";

  const tabBtnCls = (active: boolean) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "dark:text-primary text-primary dark:border-primary border-primary"
        : "dark:text-muted-foreground text-muted-foreground border-transparent dark:hover:text-foreground hover:text-foreground"
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white text-foreground">Price Snapshots</h1>
          <p className="mt-1 text-sm dark:text-muted-foreground text-muted-foreground">
            {tab === "latest" ? "Latest price per product per company" : `${total} total snapshots`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}
          className="rounded-xl gap-2 dark:border-primary/30 border-primary/20">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b dark:border-white/5 border-border flex gap-1">
        <button className={tabBtnCls(tab === "latest")} onClick={() => setTab("latest")}>Latest Prices</button>
        <button className={tabBtnCls(tab === "all")} onClick={() => setTab("all")}>Full History</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className={selectCls} value={filterComp} onChange={e => setFilterComp(e.target.value)}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={selectCls} value={filterProd} onChange={e => setFilterProd(e.target.value)}>
          <option value="">All Products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
        </select>
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
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Product</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Company</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden md:table-cell">Title Found</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Price</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden sm:table-cell">Availability</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden lg:table-cell">Checked At</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden xl:table-cell">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5 divide-border">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center dark:text-muted-foreground text-muted-foreground">Loading…</td></tr>
              ) : snapshots.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center dark:text-muted-foreground text-muted-foreground">
                  <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No snapshots yet — run a scrape to collect prices
                </td></tr>
              ) : (
                snapshots.map(snap => (
                  <tr key={snap.id} className="dark:hover:bg-white/[0.02] hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {snap.image_url ? (
                          <img src={snap.image_url} alt="" className="h-10 w-10 rounded-lg object-contain shrink-0 dark:bg-white/5 bg-muted/50 border dark:border-white/10 border-border" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg shrink-0 dark:bg-white/5 bg-muted/30 border dark:border-white/10 border-border" />
                        )}
                        <div className="font-medium dark:text-white text-foreground text-sm">{snap.internal_name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="dark:text-muted-foreground text-muted-foreground text-sm">{snap.company_name}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell max-w-[220px]">
                      <span className="text-xs dark:text-muted-foreground text-muted-foreground truncate block" title={snap.title_found ?? ""}>
                        {snap.title_found ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {snap.price !== null ? (
                        <span className="font-semibold dark:text-white text-foreground">
                          {snap.currency} {Number(snap.price).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs dark:text-muted-foreground text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <AvailBadge avail={snap.availability} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={snap.scrape_status} />
                      {snap.error_message && (
                        <p className="text-[10px] dark:text-red-400 text-red-500 mt-0.5 max-w-[120px] truncate" title={snap.error_message}>
                          {snap.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-xs dark:text-muted-foreground text-muted-foreground whitespace-nowrap">
                        {formatDate(snap.checked_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      {snap.product_url ? (
                        <a href={snap.product_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 dark:text-primary text-primary hover:underline text-xs">
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                      ) : (
                        <span className="text-xs dark:text-muted-foreground text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (all-history tab only) */}
        {tab === "all" && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t dark:border-white/5 border-border">
            <p className="text-xs dark:text-muted-foreground text-muted-foreground">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg h-7 px-3 text-xs">Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg h-7 px-3 text-xs">Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
