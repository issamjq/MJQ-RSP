import { useEffect, useState, useCallback, useRef } from "react";
import { Link2, Plus, RefreshCw, Pencil, Trash2, Play, ExternalLink, Check, X, Sparkles, PlayCircle, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner@2.0.3";
import {
  urlsApi,
  companiesApi,
  productsApi,
  scraperApi,
  syncRunsApi,
  type ProductCompanyUrl,
  type Company,
  type Product,
  type SyncRun,
} from "../../lib/monitorApi";
import { DiscoverModal } from "./DiscoverModal";

// ── Scrape Progress Banner ─────────────────────────────────────────

function ScrapeProgressBanner({ runId, total, onDone }: { runId: number; total: number; onDone: () => void }) {
  const [run, setRun] = useState<SyncRun | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await syncRunsApi.get(runId);
        setRun(res.data);
        if (res.data.status !== "running") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(onDone, 4000);
        }
      } catch { /* silent */ }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [runId, onDone]);

  const checked   = run?.total_checked ?? 0;
  const success   = run?.success_count ?? 0;
  const failed    = run?.fail_count    ?? 0;
  const totalUrls = total || Number(run?.meta?.url_count ?? 0);
  const pct       = totalUrls > 0 ? Math.round((checked / totalUrls) * 100) : 0;
  const isDone    = run && run.status !== "running";

  const statusIcon = !isDone ? null
    : run?.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    : run?.status === "partial"   ? <AlertCircle  className="h-4 w-4 text-amber-500" />
    : <XCircle className="h-4 w-4 text-red-500" />;

  const statusColor = !isDone ? "border-gray-200"
    : run?.status === "completed" ? "border-emerald-200"
    : run?.status === "partial"   ? "border-amber-200"
    : "border-red-200";

  const barColor = !isDone ? "bg-gray-900"
    : run?.status === "completed" ? "bg-emerald-500"
    : run?.status === "partial"   ? "bg-amber-500"
    : "bg-red-500";

  return (
    <div className={`rounded-xl border ${statusColor} bg-white shadow-sm p-4 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {statusIcon ?? (
            <span className="flex h-4 w-4 items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-gray-900 animate-pulse" />
            </span>
          )}
          <span className="text-sm font-semibold text-foreground">
            {!isDone ? "Scraping in progress…"
              : run?.status === "completed" ? "Scrape complete"
              : run?.status === "partial"   ? "Scrape finished with some errors"
              : "Scrape failed"}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {checked} / {totalUrls || "?"} URLs
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden mb-2.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Counts */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1 text-emerald-600">
          <Check className="h-3 w-3" /> {success} success
        </span>
        <span className="flex items-center gap-1 text-red-500">
          <X className="h-3 w-3" /> {failed} failed
        </span>
        {!isDone && totalUrls - checked > 0 && (
          <span className="text-muted-foreground">
            {totalUrls - checked} remaining
          </span>
        )}
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────

function ScrapeStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    error:   "bg-red-100 text-red-700 border-red-200",
    timeout: "bg-amber-100 text-amber-700 border-amber-200",
    no_price:"bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${map[status] ?? map.no_price}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Add/Edit URL Modal (slide-in from right) ───────────────────────

function UrlForm({ open, initial, companies, products, onClose, onSaved }: {
  open: boolean;
  initial?: Partial<ProductCompanyUrl>;
  companies: Company[];
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [productId,  setProductId]  = useState(String(initial?.product_id  ?? ""));
  const [companyId,  setCompanyId]  = useState(String(initial?.company_id  ?? ""));
  const [url,        setUrl]        = useState(initial?.product_url         ?? "");
  const [currency,   setCurrency]   = useState(initial?.currency            ?? "AED");
  const [selPrice,   setSelPrice]   = useState(initial?.selector_price      ?? "");
  const [selTitle,   setSelTitle]   = useState(initial?.selector_title      ?? "");
  const [selAvail,   setSelAvail]   = useState(initial?.selector_availability ?? "");
  const [active,     setActive]     = useState(initial?.is_active           ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setProductId(String(initial?.product_id ?? ""));
      setCompanyId(String(initial?.company_id ?? ""));
      setUrl(initial?.product_url ?? "");
      setCurrency(initial?.currency ?? "AED");
      setSelPrice(initial?.selector_price ?? "");
      setSelTitle(initial?.selector_title ?? "");
      setSelAvail(initial?.selector_availability ?? "");
      setActive(initial?.is_active ?? true);
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!productId || !companyId) { toast.error("Product and Company are required"); return; }
    if (!url.trim()) { toast.error("Product URL is required"); return; }
    setSaving(true);
    try {
      const body = {
        product_id: parseInt(productId),
        company_id: parseInt(companyId),
        product_url: url,
        currency,
        selector_price: selPrice || undefined,
        selector_title: selTitle || undefined,
        selector_availability: selAvail || undefined,
      };
      if (isEdit && initial?.id) {
        await urlsApi.update(initial.id, { ...body, is_active: active });
        toast.success("URL updated");
      } else {
        await urlsApi.create(body);
        toast.success("URL mapping created");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/5";
  const selectCls = inputCls;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-white/10 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? "Edit URL Mapping" : "Add URL Mapping"}
          </h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Product *</label>
              <select className={selectCls} value={productId} onChange={e => setProductId(e.target.value)} disabled={isEdit}>
                <option value="">Select product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Company *</label>
              <select className={selectCls} value={companyId} onChange={e => setCompanyId(e.target.value)} disabled={isEdit}>
                <option value="">Select company…</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Product URL *</label>
            <input className={inputCls} placeholder="https://www.amazon.ae/dp/B07FNS3HJF" value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Currency</label>
            <select className={selectCls} value={currency} onChange={e => setCurrency(e.target.value)}>
              <option>AED</option><option>USD</option><option>SAR</option>
            </select>
          </div>

          {/* Optional selector overrides */}
          <div className="rounded-lg p-3 bg-gray-50/50 border border-gray-200 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Selector Overrides (optional — leave blank to use company defaults)
            </p>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Price CSS Selector</label>
              <input className={inputCls} placeholder=".a-price .a-offscreen" value={selPrice} onChange={e => setSelPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Title CSS Selector</label>
              <input className={inputCls} placeholder="#productTitle" value={selTitle} onChange={e => setSelTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Availability CSS Selector</label>
              <input className={inputCls} placeholder="#availability span" value={selAvail} onChange={e => setSelAvail(e.target.value)} />
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" />
              <span className="text-sm text-foreground">Active</span>
            </label>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-lg bg-black text-white hover:bg-gray-800">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export function ProductUrlsPage() {
  const [urls,      setUrls]      = useState<ProductCompanyUrl[]>([]);
  const [total,     setTotal]     = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filterCompany, setFilterCompany] = useState("");
  const [page,      setPage]      = useState(1);
  const [formOpen, setFormOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<ProductCompanyUrl | undefined>();
  const [scraping, setScraping]   = useState<number | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [activeRun, setActiveRun] = useState<{ runId: number; total: number } | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);

  const LIMIT = 25;

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
      const res = await urlsApi.list({
        company_id: filterCompany ? parseInt(filterCompany) : undefined,
        page,
        limit: LIMIT,
      });
      setUrls(res.data);
      setTotal(res.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filterCompany, page]);

  useEffect(() => { loadRefs(); }, [loadRefs]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [filterCompany]);

  const handleDelete = async (u: ProductCompanyUrl) => {
    if (!confirm(`Remove ${u.internal_name} → ${u.company_name} mapping?`)) return;
    try {
      await urlsApi.delete(u.id);
      toast.success("URL mapping removed");
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error(msg);
    }
  };

  const handleScrapeOne = async (u: ProductCompanyUrl) => {
    setScraping(u.id);
    try {
      const res = await scraperApi.runOne(u.id);
      const run = res.data;
      if (run.status === "completed") {
        toast.success(`Scraped successfully — ${run.success_count}/${run.total_checked} OK`);
      } else {
        toast.warning(`Scrape finished with status: ${run.status}`);
      }
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scrape failed";
      toast.error(msg);
    } finally {
      setScraping(null);
    }
  };

  const handleScrapeSelected = async () => {
    if (selected.size === 0) return;
    setBulkRunning(true);
    try {
      const res = await scraperApi.runMany(Array.from(selected));
      setActiveRun({ runId: res.data.run_id, total: res.data.total });
      setSelected(new Set());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start scrape");
    } finally {
      setBulkRunning(false);
    }
  };

  const handleScrapeAll = async () => {
    setBulkRunning(true);
    try {
      const res = await scraperApi.runAll();
      setActiveRun({ runId: res.data.run_id, total: res.data.total });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start scrape");
    } finally {
      setBulkRunning(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === urls.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(urls.map(u => u.id)));
    }
  };

  const openAdd  = () => { setEditTarget(undefined); setFormOpen(true); };
  const openEdit = (u: ProductCompanyUrl) => { setEditTarget(u); setFormOpen(true); };

  const totalPages = Math.ceil(total / LIMIT);
  const selectCls  = "rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 text-foreground focus:outline-none focus:ring-2 focus:ring-black/5";

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Product URLs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} URL mapping{total !== 1 ? "s" : ""} being monitored
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="rounded-lg gap-2 border-gray-200 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDiscoverOpen(true)}
            className="rounded-lg gap-2 border-gray-200 hover:bg-gray-50">
            <Sparkles className="h-4 w-4" /> Auto-Discover
          </Button>

          {/* Scrape Selected */}
          {selected.size > 0 && (
            <Button size="sm" disabled={bulkRunning}
              onClick={handleScrapeSelected}
              className="rounded-lg gap-2 bg-black text-white hover:bg-gray-800">
              <Play className="h-4 w-4" />
              Scrape {selected.size} selected
            </Button>
          )}

          {/* Scrape All */}
          <Button variant="outline" size="sm" disabled={bulkRunning || scraping !== null}
            onClick={handleScrapeAll}
            className="rounded-lg gap-2 border-gray-200 hover:bg-gray-50">
            <PlayCircle className="h-4 w-4" />
            {bulkRunning ? "Starting…" : "Scrape All"}
          </Button>

          <Button size="sm" onClick={openAdd}
            className="rounded-lg gap-2 bg-black text-white hover:bg-gray-800">
            <Plus className="h-4 w-4" /> Add URL
          </Button>
        </div>
      </div>

      {/* Live scrape progress */}
      {activeRun && (
        <ScrapeProgressBanner
          runId={activeRun.runId}
          total={activeRun.total}
          onDone={() => { setActiveRun(null); load(); }}
        />
      )}

      {/* Filter */}
      <select className={selectCls} value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
        <option value="">All Companies</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="pl-4 pr-2 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={urls.length > 0 && selected.size === urls.length}
                    ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < urls.length; }}
                    onChange={toggleSelectAll}
                    className="rounded cursor-pointer"
                  />
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Product</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Company</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">URL</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Last Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Last Checked</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Active</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : urls.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                  <Link2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No URL mappings yet — add one to start tracking prices
                </td></tr>
              ) : (
                urls.map(u => (
                  <tr key={u.id} className={`border-b border-gray-50 transition-colors ${selected.has(u.id) ? "bg-gray-50" : "hover:bg-gray-50/50"}`}>
                    <td className="pl-4 pr-2 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.image_url ? (
                          <img src={u.image_url} alt="" className="h-10 w-10 rounded-lg object-contain shrink-0 bg-gray-50 border border-gray-100" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg shrink-0 bg-gray-50 border border-gray-100" />
                        )}
                        <div>
                          <div className="font-medium text-foreground text-sm">{u.internal_name}</div>
                          {u.internal_sku && <div className="text-xs text-muted-foreground font-mono">{u.internal_sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-muted-foreground">{u.company_name}</span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell max-w-[200px]">
                      <a href={u.product_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-gray-700 hover:underline text-xs truncate">
                        <span className="truncate">{u.product_url}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <ScrapeStatusBadge status={u.last_status} />
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(u.last_checked_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {u.is_active
                        ? <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                        : <X className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="icon" title={scraping !== null && scraping !== u.id ? "Wait for current scrape to finish" : "Scrape this URL"}
                          disabled={scraping !== null}
                          onClick={() => handleScrapeOne(u)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-gray-900 hover:bg-gray-100">
                          <Play className={`h-3.5 w-3.5 ${scraping === u.id ? "animate-pulse" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(u)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-gray-900 hover:bg-gray-100">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(u)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <p className="text-xs text-muted-foreground">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg h-7 px-3 text-xs border-gray-200">Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg h-7 px-3 text-xs border-gray-200">Next</Button>
            </div>
          </div>
        )}
      </div>

      <UrlForm
        open={formOpen}
        initial={editTarget}
        companies={companies}
        products={products}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <DiscoverModal
        open={discoverOpen}
        onClose={() => setDiscoverOpen(false)}
        companies={companies}
        products={products}
        onAdded={() => { load(); }}
      />
    </div>
  );
}
