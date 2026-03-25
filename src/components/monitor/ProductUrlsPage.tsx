import { useEffect, useState, useCallback } from "react";
import { Link2, Plus, RefreshCw, Pencil, Trash2, Play, ExternalLink, Check, X, Sparkles, PlayCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { toast } from "sonner@2.0.3";
import {
  urlsApi,
  companiesApi,
  productsApi,
  scraperApi,
  type ProductCompanyUrl,
  type Company,
  type Product,
} from "../../lib/monitorApi";
import { DiscoverModal } from "./DiscoverModal";

// ── Status Badge ───────────────────────────────────────────────────

function ScrapeStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs dark:text-muted-foreground text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    success: "dark:bg-emerald-500/15 bg-emerald-100 dark:text-emerald-400 text-emerald-700 dark:border-emerald-500/30 border-emerald-200",
    error:   "dark:bg-red-500/15 bg-red-100 dark:text-red-400 text-red-700 dark:border-red-500/30 border-red-200",
    timeout: "dark:bg-amber-500/15 bg-amber-100 dark:text-amber-400 text-amber-700 dark:border-amber-500/30 border-amber-200",
    no_price:"dark:bg-zinc-500/15 bg-zinc-100 dark:text-zinc-400 text-zinc-600 dark:border-zinc-500/30 border-zinc-200",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${map[status] ?? map.no_price}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Add/Edit URL Modal ─────────────────────────────────────────────

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

  const inputCls = "w-full rounded-xl px-3 py-2 text-sm dark:bg-[#1A1A2E] bg-muted/50 border dark:border-white/10 border-border dark:text-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 dark:focus:ring-primary/50 focus:ring-primary/30";
  const selectCls = inputCls;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="dark:bg-[#12121C] bg-white border dark:border-primary/20 border-primary/15 rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="dark:text-white text-foreground">
            {isEdit ? "Edit URL Mapping" : "Add URL Mapping"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">Product *</label>
              <select className={selectCls} value={productId} onChange={e => setProductId(e.target.value)} disabled={isEdit}>
                <option value="">Select product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">Company *</label>
              <select className={selectCls} value={companyId} onChange={e => setCompanyId(e.target.value)} disabled={isEdit}>
                <option value="">Select company…</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">Product URL *</label>
            <input className={inputCls} placeholder="https://www.amazon.ae/dp/B07FNS3HJF" value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">Currency</label>
            <select className={selectCls} value={currency} onChange={e => setCurrency(e.target.value)}>
              <option>AED</option><option>USD</option><option>SAR</option>
            </select>
          </div>

          {/* Optional selector overrides */}
          <div className="rounded-xl p-3 dark:bg-white/[0.03] bg-muted/30 border dark:border-white/5 border-border space-y-3">
            <p className="text-xs font-semibold dark:text-muted-foreground text-muted-foreground uppercase tracking-wide">
              Selector Overrides (optional — leave blank to use company defaults)
            </p>
            <div className="space-y-1.5">
              <label className="text-xs dark:text-muted-foreground text-muted-foreground">Price CSS Selector</label>
              <input className={inputCls} placeholder=".a-price .a-offscreen" value={selPrice} onChange={e => setSelPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs dark:text-muted-foreground text-muted-foreground">Title CSS Selector</label>
              <input className={inputCls} placeholder="#productTitle" value={selTitle} onChange={e => setSelTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs dark:text-muted-foreground text-muted-foreground">Availability CSS Selector</label>
              <input className={inputCls} placeholder="#availability span" value={selAvail} onChange={e => setSelAvail(e.target.value)} />
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" />
              <span className="text-sm dark:text-white text-foreground">Active</span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90 text-white">
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      await scraperApi.runMany(Array.from(selected));
      toast.success(`Scraping ${selected.size} URL(s) started — check Sync Runs for progress`);
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
      await scraperApi.runAll();
      toast.success("Scraping all URLs started — check Sync Runs for progress");
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
  const selectCls  = "rounded-xl px-3 py-2 text-sm dark:bg-[#1A1A2E] bg-muted/50 border dark:border-white/10 border-border dark:text-white text-foreground focus:outline-none focus:ring-1 dark:focus:ring-primary/50 focus:ring-primary/30";

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
          <h1 className="text-2xl font-bold tracking-tight dark:text-white text-foreground">Product URLs</h1>
          <p className="mt-1 text-sm dark:text-muted-foreground text-muted-foreground">
            {total} URL mapping{total !== 1 ? "s" : ""} being monitored
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="rounded-xl gap-2 dark:border-primary/30 border-primary/20">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDiscoverOpen(true)}
            className="rounded-xl gap-2 dark:border-primary/30 border-primary/20">
            <Sparkles className="h-4 w-4" /> Auto-Discover
          </Button>

          {/* Scrape Selected — only when items are checked */}
          {selected.size > 0 && (
            <Button size="sm" disabled={bulkRunning}
              onClick={handleScrapeSelected}
              className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Play className="h-4 w-4" />
              Scrape {selected.size} selected
            </Button>
          )}

          {/* Scrape All */}
          <Button variant="outline" size="sm" disabled={bulkRunning || scraping !== null}
            onClick={handleScrapeAll}
            className="rounded-xl gap-2 dark:border-primary/30 border-primary/20">
            <PlayCircle className="h-4 w-4" />
            {bulkRunning ? "Starting…" : "Scrape All"}
          </Button>

          <Button size="sm" onClick={openAdd}
            className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-4 w-4" /> Add URL
          </Button>
        </div>
      </div>

      {/* Filter */}
      <select className={selectCls} value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
        <option value="">All Companies</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {/* Table */}
      <div
        className="rounded-2xl dark:bg-gradient-to-br dark:from-[#12121C] dark:to-[#16162A] bg-white border dark:border-primary/20 border-primary/15 overflow-hidden"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-white/5 border-border">
                <th className="pl-4 pr-2 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={urls.length > 0 && selected.size === urls.length}
                    ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < urls.length; }}
                    onChange={toggleSelectAll}
                    className="rounded cursor-pointer accent-primary"
                  />
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Product</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Company</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden lg:table-cell">URL</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Last Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden md:table-cell">Last Checked</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Active</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5 divide-border">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center dark:text-muted-foreground text-muted-foreground">Loading…</td></tr>
              ) : urls.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center dark:text-muted-foreground text-muted-foreground">
                  <Link2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No URL mappings yet — add one to start tracking prices
                </td></tr>
              ) : (
                urls.map(u => (
                  <tr key={u.id} className={`transition-colors ${selected.has(u.id) ? "dark:bg-primary/5 bg-primary/5" : "dark:hover:bg-white/[0.02] hover:bg-muted/30"}`}>
                    <td className="pl-4 pr-2 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="rounded cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {u.image_url ? (
                          <img src={u.image_url} alt="" className="h-10 w-10 rounded-lg object-contain shrink-0 dark:bg-white/5 bg-muted/50 border dark:border-white/10 border-border" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg shrink-0 dark:bg-white/5 bg-muted/30 border dark:border-white/10 border-border" />
                        )}
                        <div>
                          <div className="font-medium dark:text-white text-foreground text-sm">{u.internal_name}</div>
                          {u.internal_sku && <div className="text-xs dark:text-muted-foreground text-muted-foreground font-mono">{u.internal_sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="dark:text-muted-foreground text-muted-foreground">{u.company_name}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell max-w-[200px]">
                      <a href={u.product_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 dark:text-primary text-primary hover:underline text-xs truncate">
                        <span className="truncate">{u.product_url}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-5 py-3.5">
                      <ScrapeStatusBadge status={u.last_status} />
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-xs dark:text-muted-foreground text-muted-foreground">
                        {formatDate(u.last_checked_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {u.is_active
                        ? <Check className="h-4 w-4 dark:text-emerald-400 text-emerald-600 mx-auto" />
                        : <X className="h-4 w-4 dark:text-muted-foreground text-muted-foreground mx-auto" />}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="icon" title={scraping !== null && scraping !== u.id ? "Wait for current scrape to finish" : "Scrape this URL"}
                          disabled={scraping !== null}
                          onClick={() => handleScrapeOne(u)}
                          className="h-8 w-8 rounded-lg dark:text-muted-foreground text-muted-foreground dark:hover:text-primary hover:text-primary">
                          <Play className={`h-3.5 w-3.5 ${scraping === u.id ? "animate-pulse" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(u)}
                          className="h-8 w-8 rounded-lg dark:text-muted-foreground text-muted-foreground dark:hover:text-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(u)}
                          className="h-8 w-8 rounded-lg dark:text-muted-foreground text-muted-foreground dark:hover:text-red-400 hover:text-red-500">
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
