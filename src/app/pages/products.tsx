import { AppSidebar } from '../components/app-sidebar';
import { Skeleton } from '../components/ui/skeleton';
import { Package, Search, Grid3x3, List, RefreshCw, Download, Plus, Edit, Trash2, X, Loader2 } from 'lucide-react';
import { MultiSelect } from '../components/multi-select';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { productsApi } from '../../lib/monitorApi';
import type { Product } from '../../lib/monitorApi';
import { toast } from 'sonner';

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const vals: string[] = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur); cur = ''; }
      else { cur += ch; }
    }
    vals.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || '').trim()]));
  });
}

export function Products() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [filterBrands, setFilterBrands] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<Product[]>([]);
  const [sortKey, setSortKey] = useState<'name' | 'brand' | 'sku'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const si = (key: string) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const sortedProducts = useMemo(() => {
    const filtered = filterBrands.size > 0 ? products.filter(p => filterBrands.has(p.brand ?? '')) : products;
    return [...filtered].sort((a, b) => {
      const d = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') return a.internal_name.localeCompare(b.internal_name) * d;
      if (sortKey === 'brand') return (a.brand ?? '').localeCompare(b.brand ?? '') * d;
      if (sortKey === 'sku') return (a.internal_sku ?? '').localeCompare(b.internal_sku ?? '') * d;
      return 0;
    });
  }, [products, sortKey, sortDir, filterBrands]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ internal_name: '', brand: '', internal_sku: '', barcode: '', image_url: '', initial_rsp: '' });
  const csvRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<Array<Record<string, string>>>([]);
  const [showBrandFilter, setShowBrandFilter] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await productsApi.list({ search: q || search, limit: 200 });
      setProducts(res.data);
      setTotal(res.total);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ internal_name: '', brand: '', internal_sku: '', barcode: '', image_url: '', initial_rsp: '' });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditTarget(p);
    setForm({ internal_name: p.internal_name, brand: p.brand || '', internal_sku: p.internal_sku || '', barcode: p.barcode || '', image_url: p.image_url || '', initial_rsp: p.initial_rsp != null ? String(p.initial_rsp) : '' });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.internal_name.trim()) { toast.error('Product name is required'); return; }
    setSaving(true);
    try {
      const rsp = form.initial_rsp.trim() ? Number(form.initial_rsp) : null;
      if (editTarget) {
        await productsApi.update(editTarget.id, { internal_name: form.internal_name, brand: form.brand || undefined, internal_sku: form.internal_sku || undefined, barcode: form.barcode || undefined, image_url: form.image_url || undefined, initial_rsp: rsp });
        toast.success('Product updated');
      } else {
        await productsApi.create({ internal_name: form.internal_name, brand: form.brand || undefined, internal_sku: form.internal_sku || undefined, barcode: form.barcode || undefined, image_url: form.image_url || undefined, initial_rsp: rsp });
        toast.success('Product added');
      }
      setShowModal(false);
      load();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete "${p.internal_name}"?`)) return;
    try {
      await productsApi.delete(p.id);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text).filter(r => r['Item Name'] || r['internal_name']);
    if (!rows.length) { toast.error('No valid rows found'); return; }
    const brands = [...new Set(rows.map(r => r['Brand'] || r['brand'] || '').filter(Boolean))].sort();
    setCsvRows(rows);
    setSelectedBrands(new Set(brands));
    setShowBrandFilter(true);
    if (csvRef.current) csvRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    const filtered = csvRows
      .map(r => ({
        internal_name: r['Item Name'] || r['internal_name'] || '',
        internal_sku: r['Id'] || r['internal_sku'] || '',
        barcode: r['SKU'] || r['barcode'] || '',
        brand: r['Brand'] || r['brand'] || '',
        image_url: r['ImageUrl'] || r['image_url'] || '',
        initial_rsp: r['Initial RSP'] || r['initial_rsp'] || '',
        is_active: (r['Is Visible'] || r['is_active'] || 'true').toLowerCase() !== 'false',
      }))
      .filter(r => r.internal_name && (selectedBrands.size === 0 || selectedBrands.has(r.brand)));
    if (!filtered.length) { toast.error('No products match the selected brands'); return; }
    setImporting(true);
    try {
      const res = await productsApi.import(filtered);
      const { inserted, updated, skipped } = res.data;
      const parts = [`${inserted} added`, `${updated} updated`, `${skipped} skipped (no changes)`];
      toast.success(`Import complete — ${parts.join(' · ')}`);
      setShowBrandFilter(false);
      load();
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const brandColors = ['bg-green-50 text-green-700 border-green-200', 'bg-blue-50 text-blue-700 border-blue-200', 'bg-purple-50 text-purple-700 border-purple-200', 'bg-orange-50 text-orange-700 border-orange-200', 'bg-pink-50 text-pink-700 border-pink-200'];
  const brandColor = (brand: string) => brandColors[Math.abs(brand.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % brandColors.length];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Products</h1>
              <p className="text-sm text-muted-foreground mt-1">{total} products · reference catalog</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}><Grid3x3 className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}><List className="w-4 h-4" /></button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button onClick={() => load()} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"><RefreshCw className="w-4 h-4" /></button>
              <button onClick={() => csvRef.current?.click()} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
                <Download className="w-4 h-4" />
                Import CSV
              </button>
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                Add
              </button>
              <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search name, SKU, barcode, brand..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" />
            </div>
            {(() => {
              const brands = [...new Set(products.map(p => p.brand ?? '').filter(Boolean))].sort();
              return brands.length > 0 ? (
                <MultiSelect
                  label="Brand"
                  options={brands.map(b => ({ value: b, label: b }))}
                  selected={filterBrands}
                  onChange={setFilterBrands}
                />
              ) : null;
            })()}
          </div>

          {loading ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                    <Skeleton className="aspect-square w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-3.5 border-b border-gray-50 last:border-0">
                    <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                ))}
              </div>
            )
          ) : products.length === 0 ? (
            <div className="bg-white rounded-xl p-12 border border-gray-100 shadow-sm text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h2 className="text-lg font-semibold mb-2">No products found</h2>
              <p className="text-sm text-muted-foreground">Try adjusting your search query</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                  <div className="aspect-square bg-gray-50 relative overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.internal_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(product)} className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"><Edit className="w-4 h-4 text-gray-700" /></button>
                      <button onClick={() => handleDelete(product)} className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"><Trash2 className="w-4 h-4 text-red-600" /></button>
                    </div>
                  </div>
                  <div className="p-4">
                    {product.brand && (
                      <div className="mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${brandColor(product.brand)}`}>{product.brand}</span>
                      </div>
                    )}
                    <h3 className="text-sm font-medium mb-2 line-clamp-2 min-h-[2.5rem]">{product.internal_name}</h3>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {product.internal_sku && <p>{product.internal_sku}</p>}
                      {product.barcode && <p>{product.barcode}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {sortedProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 px-4 py-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.internal_name} className="w-10 h-10 rounded-lg object-cover shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words">{product.internal_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
                        {product.initial_rsp != null && <p className="text-xs font-medium text-gray-700">AED {Number(product.initial_rsp).toFixed(2)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(product)} className="p-1.5 hover:bg-gray-100 rounded transition-colors"><Edit className="w-4 h-4 text-gray-600" /></button>
                      <button onClick={() => handleDelete(product)} className="p-1.5 hover:bg-gray-100 rounded transition-colors"><Trash2 className="w-4 h-4 text-red-600" /></button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th onClick={() => handleSort('name')} className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none">Product{si('name')}</th>
                      <th onClick={() => handleSort('brand')} className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none">Brand{si('brand')}</th>
                      <th onClick={() => handleSort('sku')} className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none hidden md:table-cell">SKU{si('sku')}</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Barcode</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Initial RSP</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 max-w-xs">
                          <div className="flex items-start gap-3">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.internal_name} className="w-10 h-10 rounded-lg object-cover shrink-0 mt-0.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <span className="font-medium text-sm break-words">{product.internal_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {product.brand && <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${brandColor(product.brand)}`}>{product.brand}</span>}
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell text-sm text-muted-foreground">{product.internal_sku || '—'}</td>
                        <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">{product.barcode || '—'}</td>
                        <td className="px-6 py-4 hidden sm:table-cell text-sm font-medium">
                          {product.initial_rsp != null ? `AED ${Number(product.initial_rsp).toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(product)} className="p-1.5 hover:bg-gray-100 rounded transition-colors"><Edit className="w-4 h-4 text-gray-600" /></button>
                            <button onClick={() => handleDelete(product)} className="p-1.5 hover:bg-gray-100 rounded transition-colors"><Trash2 className="w-4 h-4 text-red-600" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 z-50 bg-white/10 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{editTarget ? 'Edit Product' : 'Add Product'}</h2>
                <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                  <input type="text" value={form.internal_name} onChange={e => setForm(f => ({ ...f, internal_name: e.target.value }))} placeholder="Enter product name" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                  <input type="text" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Enter brand" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                  <input type="text" value={form.internal_sku} onChange={e => setForm(f => ({ ...f, internal_sku: e.target.value }))} placeholder="Internal SKU" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
                  <input type="text" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="Barcode" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                  <input type="url" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://example.com/image.jpg" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Initial RSP <span className="text-muted-foreground font-normal">(AED)</span></label>
                  <input type="number" min="0" step="0.01" value={form.initial_rsp} onChange={e => setForm(f => ({ ...f, initial_rsp: e.target.value }))} placeholder="0.00" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editTarget ? 'Save Changes' : 'Add Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Brand filter modal for CSV import */}
      {showBrandFilter && (() => {
        const allBrands = [...new Set(csvRows.map(r => r['Brand'] || r['brand'] || '').filter(Boolean))].sort();
        const noBrand = csvRows.filter(r => !(r['Brand'] || r['brand'])).length;
        const toggleBrand = (b: string) => setSelectedBrands(prev => { const n = new Set(prev); n.has(b) ? n.delete(b) : n.add(b); return n; });
        const countFor = (b: string) => csvRows.filter(r => (r['Brand'] || r['brand'] || '') === b).length;
        const total = csvRows.filter(r => selectedBrands.has(r['Brand'] || r['brand'] || '')).length;
        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowBrandFilter(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="p-6 pb-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold">Filter by Brand</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{csvRows.length} products in file · {total} selected</p>
                    </div>
                    <button onClick={() => setShowBrandFilter(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-1 max-h-72 overflow-y-auto">
                  <button onClick={() => setSelectedBrands(new Set(allBrands))} className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors">Select all</button>
                  <button onClick={() => setSelectedBrands(new Set())} className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">Deselect all</button>
                  <div className="border-t border-gray-100 mt-1 pt-1 space-y-0.5">
                    {allBrands.map(brand => (
                      <label key={brand} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedBrands.has(brand)} onChange={() => toggleBrand(brand)} className="w-4 h-4 rounded accent-black" />
                        <span className="flex-1 text-sm font-medium">{brand}</span>
                        <span className="text-xs text-muted-foreground">{countFor(brand)}</span>
                      </label>
                    ))}
                    {noBrand > 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{noBrand} rows with no brand (always included)</div>
                    )}
                  </div>
                </div>
                <div className="p-4 pt-3 border-t border-gray-100 flex gap-3">
                  <button onClick={() => setShowBrandFilter(false)} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
                  <button onClick={handleConfirmImport} disabled={importing || selectedBrands.size === 0} className="flex-1 px-4 py-2.5 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2">
                    {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                    Import {total > 0 ? `${total} products` : ''}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
