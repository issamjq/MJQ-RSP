import { AppSidebar } from '../components/app-sidebar';
import { Plus, Play, Edit, Trash2, X, Loader2, RefreshCw, Sparkles, LayoutList, LayoutGrid, Printer, ChevronRight, ExternalLink } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { urlsApi, snapshotsApi, syncRunsApi, companiesApi, productsApi, scraperApi } from '../../lib/monitorApi';
import type { ProductCompanyUrl, PriceSnapshot, Company, Product } from '../../lib/monitorApi';
import { toast } from 'sonner';

function formatRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}


// ---- Product URLs Tab ----
function ProductUrlsTab() {
  const [urls, setUrls] = useState<ProductCompanyUrl[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductCompanyUrl | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scraping, setScraping] = useState(false);
  const [progressRunId, setProgressRunId] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ total: number; done: number; success: number; fail: number } | null>(null);
  const [form, setForm] = useState({ product_id: '', company_id: '', product_url: '', currency: 'AED' });
  const [urlSortKey, setUrlSortKey] = useState<'product' | 'company' | 'last_check' | 'status'>('product');
  const [urlSortDir, setUrlSortDir] = useState<'asc' | 'desc'>('asc');
  const handleUrlSort = (key: typeof urlSortKey) => {
    if (key === urlSortKey) setUrlSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setUrlSortKey(key); setUrlSortDir('asc'); }
  };
  const usi = (key: string) => urlSortKey === key ? (urlSortDir === 'asc' ? ' ↑' : ' ↓') : '';
  const sortedUrls = useMemo(() => [...urls].sort((a, b) => {
    const d = urlSortDir === 'asc' ? 1 : -1;
    if (urlSortKey === 'product') return a.internal_name.localeCompare(b.internal_name) * d;
    if (urlSortKey === 'company') return a.company_name.localeCompare(b.company_name) * d;
    if (urlSortKey === 'last_check') return ((a.last_checked_at ? new Date(a.last_checked_at).getTime() : 0) - (b.last_checked_at ? new Date(b.last_checked_at).getTime() : 0)) * d;
    if (urlSortKey === 'status') return (a.last_status ?? '').localeCompare(b.last_status ?? '') * d;
    return 0;
  }), [urls, urlSortKey, urlSortDir]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [urlRes, compRes, prodRes] = await Promise.all([
        urlsApi.list({ limit: 500 }),
        companiesApi.list(),
        productsApi.list({ limit: 500 }),
      ]);
      setUrls(urlRes.data);
      setCompanies(compRes.data);
      setProducts(prodRes.data);
    } catch {
      toast.error('Failed to load URLs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll progress
  useEffect(() => {
    if (!progressRunId) return;
    const interval = setInterval(async () => {
      try {
        const res = await syncRunsApi.get(progressRunId);
        const run = res.data;
        setProgress({ total: run.total_checked || 0, done: run.success_count + run.fail_count, success: run.success_count, fail: run.fail_count });
        if (run.status !== 'running') {
          clearInterval(interval);
          setTimeout(() => { setProgressRunId(null); setProgress(null); setScraping(false); load(); }, 3000);
        }
      } catch { clearInterval(interval); setScraping(false); }
    }, 2000);
    return () => clearInterval(interval);
  }, [progressRunId, load]);

  const toggleSelect = (id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === urls.length ? new Set() : new Set(urls.map(u => u.id)));
  };

  const handleScrapeSelected = async () => {
    if (selected.size === 0) { toast.error('Select at least one URL'); return; }
    setScraping(true);
    try {
      const res = await scraperApi.runMany([...selected]);
      setProgressRunId(res.data.run_id);
      toast.success(`Scraping ${res.data.total} URLs…`);
      setSelected(new Set());
    } catch { toast.error('Failed to start scrape'); setScraping(false); }
  };

  const handleScrapeAll = async () => {
    setScraping(true);
    try {
      const res = await scraperApi.runAll();
      setProgressRunId(res.data.run_id);
      toast.success(`Scraping all ${res.data.total} URLs…`);
    } catch { toast.error('Failed to start scrape'); setScraping(false); }
  };

  const openAdd = () => { setEditTarget(null); setForm({ product_id: '', company_id: '', product_url: '', currency: 'AED' }); setShowModal(true); };
  const openEdit = (u: ProductCompanyUrl) => { setEditTarget(u); setForm({ product_id: String(u.product_id), company_id: String(u.company_id), product_url: u.product_url, currency: u.currency }); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !form.company_id || !form.product_url) { toast.error('All fields required'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await urlsApi.update(editTarget.id, { product_url: form.product_url, currency: form.currency });
        toast.success('URL updated');
      } else {
        await urlsApi.create({ product_id: Number(form.product_id), company_id: Number(form.company_id), product_url: form.product_url, currency: form.currency });
        toast.success('URL added');
      }
      setShowModal(false); load();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (u: ProductCompanyUrl) => {
    if (!confirm('Delete this URL?')) return;
    try { await urlsApi.delete(u.id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); }
  };

  const lastStatusColor = (s: string | null) => {
    if (!s || s === 'success') return 'text-green-600';
    if (s === 'error') return 'text-red-500';
    return 'text-amber-500';
  };

  return (
    <div>
      {/* Progress Banner */}
      {scraping && progress && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center gap-4">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-800">Scraping in progress…</span>
              <span className="text-xs text-blue-600">{progress.done}/{progress.total}</span>
            </div>
            <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
            <div className="flex gap-3 mt-1 text-xs text-blue-600">
              <span>{progress.success} success</span>
              {progress.fail > 0 && <span className="text-red-500">{progress.fail} failed</span>}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{urls.length} tracked URLs</p>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <button onClick={handleScrapeSelected} disabled={scraping} className="flex items-center gap-2 px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-60">
              <Play className="w-3.5 h-3.5" />
              Scrape Selected ({selected.size})
            </button>
          )}
          <button onClick={handleScrapeAll} disabled={scraping} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 hover:bg-gray-50 rounded-lg disabled:opacity-60">
            <Sparkles className="w-3.5 h-3.5" />
            Scrape All
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800">
            <Plus className="w-3.5 h-3.5" />
            Add URL
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0">
              <Skeleton className="w-4 h-4 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32 hidden sm:block" />
              </div>
              <Skeleton className="h-4 w-24 hidden md:block" />
              <Skeleton className="h-6 w-16 rounded-full hidden lg:block" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={selected.size === urls.length && urls.length > 0} ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < urls.length; }} onChange={toggleAll} className="rounded" />
                  </th>
                  <th onClick={() => handleUrlSort('product')} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none">Product{usi('product')}</th>
                  <th onClick={() => handleUrlSort('company')} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none hidden sm:table-cell">Company{usi('company')}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">URL</th>
                  <th onClick={() => handleUrlSort('last_check')} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none hidden lg:table-cell">Last Check{usi('last_check')}</th>
                  <th onClick={() => handleUrlSort('status')} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none hidden lg:table-cell">Status{usi('status')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedUrls.map((u) => (
                  <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${selected.has(u.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium line-clamp-1">{u.internal_name}</span>
                      {u.brand && <span className="text-xs text-muted-foreground">{u.brand}</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell"><span className="text-sm text-muted-foreground">{u.company_name}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <a href={u.product_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[200px] block">{u.product_url}</a>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {u.last_checked_at ? formatRelTime(u.last_checked_at) : '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs font-medium ${lastStatusColor(u.last_status)}`}>{u.last_status || 'pending'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setScraping(true); scraperApi.runOne(u.id).then(res => { setProgressRunId(res.data.id); toast.success('Scraping…'); }).catch(() => { toast.error('Failed'); setScraping(false); }); }} disabled={scraping} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-40" title="Scrape">
                          <Play className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-gray-100 rounded" title="Edit">
                          <Edit className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <button onClick={() => handleDelete(u)} className="p-1.5 hover:bg-gray-100 rounded" title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <>
          <div className="fixed inset-0 z-50 bg-white/10 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{editTarget ? 'Edit URL' : 'Add URL'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-600" /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-5">
                {!editTarget && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product *</label>
                      <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none text-sm">
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company *</label>
                      <select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none text-sm">
                        <option value="">Select company</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product URL *</label>
                  <input type="url" value={form.product_url} onChange={e => setForm(f => ({ ...f, product_url: e.target.value }))} placeholder="https://..." className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none text-sm">
                    <option>AED</option><option>USD</option><option>EUR</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 hover:bg-gray-50 rounded-lg">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm bg-black text-white hover:bg-gray-800 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editTarget ? 'Save' : 'Add URL'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Latest Prices Tab ----
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

type DateFilterKey = 'all' | 'today' | 'week' | 'month' | 'custom';

function applyDateFilter(
  snapshots: PriceSnapshot[],
  filter: DateFilterKey,
  start: string,
  end: string,
): PriceSnapshot[] {
  if (filter === 'all') return snapshots;
  const now = new Date();
  return snapshots.filter(s => {
    const d = new Date(s.checked_at);
    if (filter === 'today') return d.toDateString() === now.toDateString();
    if (filter === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
    if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (filter === 'custom' && start && end) {
      return d >= new Date(start + 'T00:00:00') && d <= new Date(end + 'T23:59:59');
    }
    return true;
  });
}

const DATE_FILTERS: { key: DateFilterKey; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

function printSelected(snapshots: PriceSnapshot[]) {
  const w = window.open('', '_blank');
  if (!w) return;
  const date = new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  const rows = snapshots.map((s, i) => {
    const hasDiscount = s.price != null && s.original_price != null && s.original_price !== s.price && Number(s.original_price) > Number(s.price);
    const discountPct = hasDiscount ? Math.round((Number(s.original_price) - Number(s.price)) / Number(s.original_price) * 100) : null;
    const priceCell = s.price != null
      ? `<td style="font-weight:600">${s.currency ?? ''} ${Number(s.price).toFixed(2)}${hasDiscount ? `<br><span style="text-decoration:line-through;color:#999;font-weight:400;font-size:10px">${s.currency ?? ''} ${Number(s.original_price).toFixed(2)}</span>` : ''}</td>`
      : '<td style="color:#999">—</td>';
    const discountCell = discountPct != null
      ? `<td><span style="display:inline-block;padding:2px 7px;border-radius:4px;background:#fef3c7;color:#92400e;font-weight:700;font-size:10px;letter-spacing:.03em">−${discountPct}%</span></td>`
      : '<td style="color:#ccc">—</td>';
    return `<tr>
      <td>${i + 1}</td>
      <td>${s.internal_name ?? '—'}</td>
      <td>${s.company_name ?? '—'}</td>
      ${priceCell}
      ${discountCell}
      <td>${formatDateTime(s.checked_at)}</td>
    </tr>`;
  }).join('');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Price Activity — ${date}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#111;padding:24px}
      header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:12px}
      h1{font-size:20px;font-weight:700}
      .meta{font-size:10px;color:#666;text-align:right;line-height:1.6}
      table{width:100%;border-collapse:collapse}
      thead tr{border-bottom:1.5px solid #000}
      th{text-align:left;padding:7px 10px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#555}
      td{padding:7px 10px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
      tr:last-child td{border-bottom:none}
      tr:nth-child(even){background:#fafafa}
      @media print{@page{margin:15mm;size:A4 landscape}body{padding:0}}
    </style></head><body>
    <header><div><h1>Price Activity</h1></div>
      <div class="meta"><div>${snapshots.length} item${snapshots.length !== 1 ? 's' : ''}</div><div>Exported ${date}</div></div>
    </header>
    <table>
      <thead><tr><th>#</th><th>Product</th><th>Store Name</th><th>Price</th><th>Discount</th><th>Recorded</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 250);
}

function PricesTab() {
  const [snapshots, setSnapshots] = useState<PriceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<'rows' | 'cards'>('rows');
  const [historyMode, setHistoryMode] = useState<'latest' | 'all'>('latest');
  const [dateFilter, setDateFilter] = useState<DateFilterKey>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [priceSortKey, setPriceSortKey] = useState<'store' | 'price' | 'discount' | 'recorded'>('store');
  const [priceSortDir, setPriceSortDir] = useState<'asc' | 'desc'>('asc');
  const handlePriceSort = (key: typeof priceSortKey) => {
    if (key === priceSortKey) setPriceSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setPriceSortKey(key); setPriceSortDir('asc'); }
  };
  const psi = (key: string) => priceSortKey === key ? (priceSortDir === 'asc' ? ' ↑' : ' ↓') : '';
  const [storeList, setStoreList] = useState<Company[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);

  const storeMap = useMemo(() => new Map(storeList.map(c => [c.id, c])), [storeList]);
  const productMap = useMemo(() => new Map(productList.map(p => [p.id, p])), [productList]);

  useEffect(() => {
    Promise.all([companiesApi.list(), productsApi.list({ limit: 500 })])
      .then(([cRes, pRes]) => { setStoreList(cRes.data); setProductList(pRes.data); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setSelectedRows(new Set());
    try {
      if (historyMode === 'latest') {
        const res = await snapshotsApi.latest();
        setSnapshots(res.data);
      } else {
        const res = await snapshotsApi.list({ limit: 200 });
        setSnapshots(res.data);
      }
    } catch { toast.error('Failed to load prices'); } finally { setLoading(false); }
  }, [historyMode]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    try { await snapshotsApi.delete(id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); }
  };

  const filtered = useMemo(
    () => applyDateFilter(snapshots, dateFilter, customStart, customEnd),
    [snapshots, dateFilter, customStart, customEnd],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, PriceSnapshot[]>();
    [...filtered]
      .sort((a, b) => a.internal_name.localeCompare(b.internal_name))
      .forEach(s => {
        if (!m.has(s.internal_name)) m.set(s.internal_name, []);
        m.get(s.internal_name)!.push(s);
      });
    return m;
  }, [filtered]);

  const flatRows = useMemo(() => Array.from(grouped.values()).flat(), [grouped]);

  const rowIndices = useMemo(() => {
    const map = new Map<number, number>();
    flatRows.forEach((s, i) => map.set(s.id, i + 1));
    return map;
  }, [flatRows]);

  const allSelected = flatRows.length > 0 && flatRows.every(s => selectedRows.has(s.id));
  const someSelected = flatRows.some(s => selectedRows.has(s.id));
  const selectedList = flatRows.filter(s => selectedRows.has(s.id));

  const toggleRow = (id: number) =>
    setSelectedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelectedRows(allSelected ? new Set() : new Set(flatRows.map(s => s.id)));

  const toggleGroup = (name: string) =>
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });

  return (
    <div>
      {/* Date filter bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {DATE_FILTERS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setDateFilter(opt.key)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${dateFilter === opt.key ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {opt.label}
          </button>
        ))}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 ml-1">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white" />
          </div>
        )}
      </div>

      {/* Main toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
            <button onClick={() => setDisplayMode('rows')} className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${displayMode === 'rows' ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-600'}`}>
              <LayoutList className="w-3.5 h-3.5" /><span>List</span>
            </button>
            <button onClick={() => setDisplayMode('cards')} className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${displayMode === 'cards' ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-600'}`}>
              <LayoutGrid className="w-3.5 h-3.5" /><span>Cards</span>
            </button>
          </div>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
            <button onClick={() => setHistoryMode('latest')} className={`px-3 py-2 text-sm transition-colors ${historyMode === 'latest' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>Latest</button>
            <button onClick={() => setHistoryMode('all')} className={`px-3 py-2 text-sm transition-colors ${historyMode === 'all' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>All History</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 hover:bg-white rounded-lg border border-gray-200 text-gray-500 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          {displayMode === 'rows' && (
            <button
              onClick={() => printSelected(selectedList)}
              disabled={selectedList.length === 0}
              title={selectedList.length === 0 ? 'Select rows to export' : `Export ${selectedList.length} rows`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 bg-white hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF{selectedList.length > 0 ? ` (${selectedList.length})` : ''}</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && displayMode === 'rows' && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center gap-3">
                <Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-16 ml-2" />
              </div>
              {[...Array(2)].map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <Skeleton className="w-4 h-4 rounded" /><Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-20 hidden sm:block" /><Skeleton className="h-4 w-28 hidden lg:block" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {loading && displayMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <Skeleton className="w-16 h-16 rounded-lg" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-7 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Grouped list view */}
      {!loading && displayMode === 'rows' && (
        filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-14 text-center text-sm text-muted-foreground">
            No price data for the selected period.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select-all bar */}
            <div className="flex items-center gap-3 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  className="rounded w-4 h-4"
                />
                <span>{someSelected ? `${selectedRows.size} selected` : `${filtered.length} items`}</span>
              </label>
              {someSelected && (
                <button onClick={() => setSelectedRows(new Set())} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear</button>
              )}
            </div>

            {Array.from(grouped).map(([productName, items]) => {
              const isCollapsed = collapsedGroups.has(productName);
              const groupSelectedCount = items.filter(s => selectedRows.has(s.id)).length;
              const prices = items.filter(s => s.price != null).map(s => Number(s.price));
              const minP = prices.length ? Math.min(...prices) : null;
              const maxP = prices.length ? Math.max(...prices) : null;
              const currency = items[0]?.currency ?? 'AED';

              return (
                <div key={productName} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div
                    className="px-4 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                    onClick={() => toggleGroup(productName)}
                  >
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isCollapsed ? '' : 'rotate-90'}`} />
                    {(() => {
                      const img = productMap.get(items[0]?.product_id)?.image_url;
                      return img ? (
                        <img src={img} alt="" className="w-7 h-7 rounded-md object-contain bg-white border border-gray-200 p-0.5 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : null;
                    })()}
                    <span className="font-semibold text-sm flex-1 truncate">{productName}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{items.length} store{items.length !== 1 ? 's' : ''}</span>
                    {minP !== null && (
                      <span className="text-xs font-medium shrink-0 hidden sm:block">
                        {minP === maxP ? `${currency} ${minP.toFixed(2)}` : `${currency} ${minP.toFixed(2)} – ${maxP!.toFixed(2)}`}
                      </span>
                    )}
                    {groupSelectedCount > 0 && (
                      <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full shrink-0">{groupSelectedCount}</span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-gray-50">
                          <tr>
                            <th className="w-10 px-4 py-2">
                              <input
                                type="checkbox"
                                checked={items.length > 0 && items.every(s => selectedRows.has(s.id))}
                                ref={el => { if (el) el.indeterminate = items.some(s => selectedRows.has(s.id)) && !items.every(s => selectedRows.has(s.id)); }}
                                onChange={() => {
                                  const allChk = items.every(s => selectedRows.has(s.id));
                                  setSelectedRows(prev => { const n = new Set(prev); items.forEach(s => allChk ? n.delete(s.id) : n.add(s.id)); return n; });
                                }}
                                className="rounded w-4 h-4"
                              />
                            </th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase w-10 whitespace-nowrap">#</th>
                            <th onClick={() => handlePriceSort('store')} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none">Store Name{psi('store')}</th>
                            <th onClick={() => handlePriceSort('price')} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none whitespace-nowrap w-36">Price{psi('price')}</th>
                            <th onClick={() => handlePriceSort('discount')} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none hidden sm:table-cell whitespace-nowrap w-28">Discount{psi('discount')}</th>
                            <th onClick={() => handlePriceSort('recorded')} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none hidden lg:table-cell whitespace-nowrap w-44">Recorded{psi('recorded')}</th>
                            <th className="w-16 px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {[...items].sort((a, b) => {
                            const d = priceSortDir === 'asc' ? 1 : -1;
                            if (priceSortKey === 'store') return a.company_name.localeCompare(b.company_name) * d;
                            if (priceSortKey === 'price') return ((a.price ?? Infinity) - (b.price ?? Infinity)) * d;
                            if (priceSortKey === 'discount') {
                              const da = a.original_price && a.price && Number(a.original_price) > Number(a.price) ? (Number(a.original_price) - Number(a.price)) / Number(a.original_price) : 0;
                              const db = b.original_price && b.price && Number(b.original_price) > Number(b.price) ? (Number(b.original_price) - Number(b.price)) / Number(b.original_price) : 0;
                              return (da - db) * d;
                            }
                            if (priceSortKey === 'recorded') return (new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()) * d;
                            return 0;
                          }).map(snap => {
                            const idx = rowIndices.get(snap.id) ?? 0;
                            const isSelected = selectedRows.has(snap.id);
                            const hasDiscount = snap.price != null && snap.original_price != null && snap.original_price !== snap.price && Number(snap.original_price) > Number(snap.price);
                            const discountPct = hasDiscount ? Math.round((Number(snap.original_price) - Number(snap.price)) / Number(snap.original_price) * 100) : null;
                            const storeLogo = storeMap.get(snap.company_id)?.logo_url;
                            return (
                              <tr key={snap.id} className={`transition-colors ${isSelected ? 'bg-amber-50/40' : 'hover:bg-gray-50/50'}`}>
                                <td className="px-4 py-2.5">
                                  <input type="checkbox" checked={isSelected} onChange={() => toggleRow(snap.id)} className="rounded w-4 h-4" />
                                </td>
                                <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{idx}</td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    {storeLogo && (
                                      <img src={storeLogo} alt="" className="w-7 h-7 rounded-md object-contain bg-gray-50 border border-gray-200 p-0.5 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    )}
                                    <span className="text-sm font-medium">{snap.company_name}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div>
                                    <span className="text-sm font-semibold">
                                      {snap.price != null ? `${snap.currency} ${Number(snap.price).toFixed(2)}` : <span className="text-muted-foreground font-normal">—</span>}
                                    </span>
                                    {hasDiscount && (
                                      <div className="text-xs text-muted-foreground line-through leading-tight">{snap.currency} {Number(snap.original_price).toFixed(2)}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 hidden sm:table-cell">
                                  {discountPct != null
                                    ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800">−{discountPct}%</span>
                                    : <span className="text-xs text-muted-foreground">—</span>}
                                </td>
                                <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">{formatDateTime(snap.checked_at)}</td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1">
                                    {snap.product_url && (
                                      <a href={snap.product_url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-blue-50 rounded opacity-30 hover:opacity-100 transition-all" title="Open product page">
                                        <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                                      </a>
                                    )}
                                    <button onClick={() => handleDelete(snap.id)} className="p-1 hover:bg-red-50 rounded opacity-30 hover:opacity-100 transition-all">
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Cards view */}
      {!loading && displayMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(snap => (
            <div key={snap.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 group relative hover:shadow-md transition-shadow">
              <button onClick={() => handleDelete(snap.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {(() => {
                const img = productMap.get(snap.product_id)?.image_url;
                return img ? (
                  <img src={img} alt={snap.internal_name} className="w-16 h-16 object-contain rounded-lg mb-3 bg-gray-50 border border-gray-100 p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : null;
              })()}
              <p className="text-sm font-medium line-clamp-2 mb-1">{snap.internal_name}</p>
              <div className="flex items-center gap-1.5 mb-2">
                {(() => {
                  const logo = storeMap.get(snap.company_id)?.logo_url;
                  return logo ? (
                    <img src={logo} alt="" className="w-4 h-4 rounded object-contain bg-gray-50 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : null;
                })()}
                <p className="text-xs text-muted-foreground">{snap.company_name}</p>
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                {snap.price != null
                  ? <p className="text-lg font-semibold">{snap.currency} {Number(snap.price).toFixed(2)}</p>
                  : <p className="text-sm text-muted-foreground">No price</p>}
                {snap.original_price != null && snap.original_price !== snap.price && (
                  <p className="text-xs text-muted-foreground line-through">{snap.currency} {Number(snap.original_price).toFixed(2)}</p>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{formatDateTime(snap.checked_at)}</p>
                {snap.product_url && (
                  <a href={snap.product_url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-blue-50 rounded transition-colors" title="Open product page">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full py-12 text-center text-sm text-muted-foreground">No price data for the selected period.</div>}
        </div>
      )}
    </div>
  );
}

// ---- Price Board Page ----
export function PriceBoard() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold mb-1">Price Activity</h1>
            <p className="text-sm text-muted-foreground">Price snapshots across all tracked products and stores</p>
          </div>
          <PricesTab />
        </div>
      </div>
    </div>
  );
}

// ---- Tracked URLs Page ----
export function TrackedUrls() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold mb-1">Tracked Listings</h1>
            <p className="text-sm text-muted-foreground">Manage the store URLs being monitored for each product</p>
          </div>
          <ProductUrlsTab />
        </div>
      </div>
    </div>
  );
}

