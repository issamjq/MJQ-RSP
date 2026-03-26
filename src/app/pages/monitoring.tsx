import { AppSidebar } from '../components/app-sidebar';
import { Link as LinkIcon, TrendingUp, Clock, Plus, Play, Edit, Trash2, X, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { urlsApi, snapshotsApi, syncRunsApi, companiesApi, productsApi, scraperApi } from '../../lib/monitorApi';
import type { ProductCompanyUrl, PriceSnapshot, SyncRun, Company, Product } from '../../lib/monitorApi';
import { toast } from 'sonner';

type Tab = 'urls' | 'prices' | 'runs';

function formatRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusColor(s: string) {
  if (s === 'completed') return 'bg-green-50 text-green-700';
  if (s === 'running') return 'bg-blue-50 text-blue-700';
  if (s === 'failed') return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
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
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={selected.size === urls.length && urls.length > 0} ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < urls.length; }} onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">URL</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Last Check</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {urls.map((u) => (
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
function PricesTab() {
  const [snapshots, setSnapshots] = useState<PriceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'latest' | 'all'>('latest');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'latest') {
        const res = await snapshotsApi.latest();
        setSnapshots(res.data);
      } else {
        const res = await snapshotsApi.list({ limit: 200 });
        setSnapshots(res.data);
      }
    } catch { toast.error('Failed to load prices'); } finally { setLoading(false); }
  }, [view]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    try { await snapshotsApi.delete(id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); }
  };

  const availColor = (a: string) => {
    const l = a.toLowerCase();
    if (l.includes('in stock') || l === 'in_stock') return 'text-green-600';
    if (l.includes('out') || l === 'out_of_stock') return 'text-red-500';
    return 'text-amber-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setView('latest')} className={`px-4 py-2 text-sm transition-colors ${view === 'latest' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>Latest</button>
          <button onClick={() => setView('all')} className={`px-4 py-2 text-sm transition-colors ${view === 'all' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>All History</button>
        </div>
        <button onClick={load} className="p-2 text-gray-500 hover:bg-white rounded-lg border border-gray-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : view === 'latest' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {snapshots.map(snap => (
            <div key={snap.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 group relative hover:shadow-md transition-shadow">
              <button onClick={() => handleDelete(snap.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {snap.image_url && (
                <img src={snap.image_url} alt={snap.internal_name} className="w-16 h-16 object-cover rounded-lg mb-3" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <p className="text-sm font-medium line-clamp-2 mb-1">{snap.internal_name}</p>
              <p className="text-xs text-muted-foreground mb-2">{snap.company_name}</p>
              {snap.price != null ? (
                <p className="text-lg font-semibold">{snap.currency} {Number(snap.price).toFixed(2)}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No price</p>
              )}
              <p className={`text-xs mt-1 ${availColor(snap.availability)}`}>{snap.availability}</p>
              <p className="text-xs text-muted-foreground mt-2">{formatRelTime(snap.checked_at)}</p>
            </div>
          ))}
          {snapshots.length === 0 && <div className="col-span-full py-12 text-center text-sm text-muted-foreground">No price data yet. Run a scrape first.</div>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Availability</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Checked</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snapshots.map(snap => (
                  <tr key={snap.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{snap.internal_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{snap.company_name}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{snap.price != null ? `${snap.currency} ${Number(snap.price).toFixed(2)}` : '—'}</td>
                    <td className={`px-4 py-3 text-xs hidden md:table-cell ${availColor(snap.availability)}`}>{snap.availability}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{formatRelTime(snap.checked_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(snap.id)} className="p-1.5 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Sync Runs Tab ----
function SyncRunsTab() {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await syncRunsApi.list({ limit: 50 });
      setRuns(res.data);
    } catch { toast.error('Failed to load sync runs'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const formatDuration = (run: SyncRun) => {
    if (!run.finished_at) return null;
    const ms = new Date(run.finished_at).getTime() - new Date(run.started_at).getTime();
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const runLabel = (run: SyncRun) => {
    if (run.run_type === 'full_batch') return 'Full Batch';
    if (run.run_type === 'selected_batch') return 'Selected Batch';
    if (run.run_type === 'company_batch') return run.company_name || 'Company Batch';
    return run.company_name ? `Single · ${run.company_name}` : 'Single URL';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{runs.length} recent runs</p>
        <button onClick={load} className="p-2 text-gray-500 hover:bg-white rounded-lg border border-gray-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Started</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Duration</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Results</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map(run => (
                  <tr key={run.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusColor(run.status)}`}>{run.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{runLabel(run)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{formatRelTime(run.started_at)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{formatDuration(run) || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-semibold">{run.total_checked}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="text-green-600">{run.success_count}✓</span>
                        {run.fail_count > 0 && <span className="text-red-500 ml-1">{run.fail_count}✗</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">No sync runs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main Monitoring Page ----
export function Monitoring() {
  const [tab, setTab] = useState<Tab>('urls');

  const tabs = [
    { id: 'urls' as Tab, label: 'Product URLs', icon: LinkIcon },
    { id: 'prices' as Tab, label: 'Prices', icon: TrendingUp },
    { id: 'runs' as Tab, label: 'Sync Runs', icon: Clock },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold mb-1">Monitoring</h1>
            <p className="text-sm text-muted-foreground">Real-time price monitoring and scraper management</p>
          </div>

          <div className="flex items-center border-b border-gray-200 mb-6 gap-1 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                  tab === t.id ? 'border-black text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'urls' && <ProductUrlsTab />}
          {tab === 'prices' && <PricesTab />}
          {tab === 'runs' && <SyncRunsTab />}
        </div>
      </div>
    </div>
  );
}
