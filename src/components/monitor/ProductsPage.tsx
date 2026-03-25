import { useEffect, useState, useCallback, useRef } from "react";
import { Package, Plus, RefreshCw, Pencil, Trash2, Search, Check, X, Upload, LayoutGrid, List, ExternalLink, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner@2.0.3";
import { productsApi, type Product } from "../../lib/monitorApi";

// ── CSV Parser ──────────────────────────────────────────────────────

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = parseCsvRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? "").trim(); });
    return row;
  });
}

// ── Product Form (slide-in from right) ──────────────────────────────

function ProductForm({ open, initial, onClose, onSaved }: {
  open: boolean;
  initial?: Partial<Product>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [name,     setName]     = useState(initial?.internal_name ?? "");
  const [sku,      setSku]      = useState(initial?.internal_sku  ?? "");
  const [barcode,  setBarcode]  = useState(initial?.barcode       ?? "");
  const [brand,    setBrand]    = useState(initial?.brand         ?? "");
  const [category, setCategory] = useState(initial?.category      ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url     ?? "");
  const [active,   setActive]   = useState(initial?.is_active     ?? true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.internal_name ?? "");
      setSku(initial?.internal_sku   ?? "");
      setBarcode(initial?.barcode    ?? "");
      setBrand(initial?.brand        ?? "");
      setCategory(initial?.category  ?? "");
      setImageUrl(initial?.image_url ?? "");
      setActive(initial?.is_active   ?? true);
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Product name is required"); return; }
    setSaving(true);
    try {
      const body = {
        internal_name: name,
        internal_sku:  sku      || undefined,
        barcode:       barcode  || undefined,
        brand:         brand    || undefined,
        category:      category || undefined,
        image_url:     imageUrl || undefined,
      };
      if (isEdit && initial?.id) {
        await productsApi.update(initial.id, { ...body, is_active: active });
        toast.success("Product updated");
      } else {
        await productsApi.create(body);
        toast.success("Product created");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/5";

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-white/10 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? "Edit Product" : "Add Product"}
          </h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Internal Name *</label>
            <input className={inputCls} placeholder="Nescafe Classic 200g" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">SKU</label>
              <input className={inputCls} placeholder="RSP-001" value={sku} onChange={e => setSku(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Barcode</label>
              <input className={inputCls} placeholder="6001087013052" value={barcode} onChange={e => setBarcode(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Brand</label>
              <input className={inputCls} placeholder="Nescafe" value={brand} onChange={e => setBrand(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <input className={inputCls} placeholder="Beverages" value={category} onChange={e => setCategory(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Image URL</label>
            <input className={inputCls} placeholder="https://…" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
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

// ── Product Card ────────────────────────────────────────────────────

function ProductCard({ p, onEdit, onDelete }: { p: Product; onEdit: () => void; onDelete: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group relative flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Image */}
      <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center">
        {p.image_url && !imgError ? (
          <img
            src={p.image_url}
            alt={p.internal_name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-3"
          />
        ) : (
          <Package className="h-12 w-12 text-muted-foreground/20" />
        )}
        {!p.is_active && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-red-50 text-red-500 border border-red-200">
            Inactive
          </div>
        )}
        {/* Hover actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-foreground hover:bg-white transition-colors shadow-sm"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/90 text-white hover:bg-red-500 transition-colors shadow-sm"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {p.image_url && !imgError && (
            <a
              href={p.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-foreground hover:bg-white transition-colors shadow-sm"
              title="Open image"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-4 flex-1 border-t border-gray-100">
        {p.brand && (
          <span className="self-start inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-green-50 text-green-700 border-green-200">
            {p.brand}
          </span>
        )}
        <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
          {p.internal_name}
        </p>
        {p.barcode && (
          <p className="text-[11px] font-mono text-muted-foreground/60 truncate">
            {p.barcode}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-1">
          {p.internal_sku && (
            <span className="text-[10px] text-muted-foreground/50 truncate max-w-[60%]">
              #{p.internal_sku}
            </span>
          )}
          {(p.url_count ?? 0) > 0 && (
            <span className="text-[10px] text-gray-500 font-medium">
              {p.url_count} store{Number(p.url_count) !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export function ProductsPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [formOpen, setFormOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<Product | undefined>();
  const [view, setView]           = useState<"grid" | "list">("grid");
  const [importing, setImporting] = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const LIMIT = view === "grid" ? 40 : 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.list({ search: search || undefined, page, limit: LIMIT });
      setProducts(res.data);
      setTotal(res.total);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [search, page, LIMIT]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete "${p.internal_name}"? This also removes all its URL mappings.`)) return;
    try {
      await productsApi.delete(p.id);
      toast.success("Product deleted");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);

      const products = rows
        .filter(r => r["Item Name"] && r["Id"])
        .map(r => ({
          internal_sku:  r["Id"],
          internal_name: r["Item Name"],
          brand:         r["Brand"]    || undefined,
          barcode:       r["SKU"]      || undefined,
          image_url:     r["ImageUrl"] || undefined,
          is_active:     r["Is Visible"]?.toUpperCase() !== "FALSE",
        }));

      if (products.length === 0) {
        toast.error("No valid products found in CSV");
        return;
      }

      const res = await productsApi.import(products);
      toast.success(`Imported ${res.data.total} products (${res.data.inserted} new, ${res.data.updated} updated)`);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const openAdd  = () => { setEditTarget(undefined); setFormOpen(true); };
  const openEdit = (p: Product) => { setEditTarget(p); setFormOpen(true); };
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} product{total !== 1 ? "s" : ""} · reference catalog
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`h-8 w-8 flex items-center justify-center transition-colors ${view === "grid" ? "bg-gray-900 text-white" : "text-muted-foreground hover:text-gray-900 hover:bg-gray-50"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`h-8 w-8 flex items-center justify-center transition-colors ${view === "list" ? "bg-gray-900 text-white" : "text-muted-foreground hover:text-gray-900 hover:bg-gray-50"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="rounded-lg border-gray-200 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {/* CSV import */}
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          <Button variant="outline" size="sm" disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg gap-2 border-gray-200 text-gray-700 hover:bg-gray-50">
            <Upload className="h-4 w-4" />
            {importing ? "Importing…" : "Import CSV"}
          </Button>

          <Button size="sm" onClick={openAdd}
            className="rounded-lg gap-2 bg-black text-white hover:bg-gray-800">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, SKU, barcode…"
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/5"
        />
      </div>

      {/* Grid view */}
      {view === "grid" && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white border border-gray-100 overflow-hidden">
                  <div className="skeleton aspect-square" />
                  <div className="p-3 space-y-2">
                    <div className="skeleton h-3 w-16 rounded" />
                    <div className="skeleton h-4 w-full rounded" />
                    <div className="skeleton h-3 w-3/4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Package className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">{search ? "No products match your search" : "No products yet — import CSV or add one"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {products.map(p => (
                <ProductCard key={p.id} p={p} onEdit={() => openEdit(p)} onDelete={() => handleDelete(p)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase w-10"></th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">SKU</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Brand</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell" title="Number of store URLs being monitored">Monitored Stores</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">Loading…</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    {search ? "No products match your search" : "No products yet"}
                  </td></tr>
                ) : (
                  products.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-4">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-contain p-0.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground/30" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{p.internal_name}</div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-muted-foreground font-mono text-xs">{p.internal_sku ?? "—"}</span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        {p.brand ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-xs border font-medium bg-green-50 text-green-700 border-green-200">{p.brand}</span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell text-center">
                        <span className="text-sm font-semibold text-foreground">{p.url_count ?? 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <Check className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <X className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(p)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-gray-900 hover:bg-gray-100">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(p)}
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
      )}

      {/* Grid pagination */}
      {view === "grid" && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg h-7 px-3 text-xs border-gray-200">Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg h-7 px-3 text-xs border-gray-200">Next</Button>
          </div>
        </div>
      )}

      <ProductForm
        open={formOpen}
        initial={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
