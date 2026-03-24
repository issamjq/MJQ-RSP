import { useEffect, useState, useCallback } from "react";
import { Package, Plus, RefreshCw, Pencil, Trash2, Search, Check, X } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { toast } from "sonner@2.0.3";
import { productsApi, type Product } from "../../lib/monitorApi";

// ── Form Modal ─────────────────────────────────────────────────────

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
  const [active,   setActive]   = useState(initial?.is_active     ?? true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.internal_name ?? "");
      setSku(initial?.internal_sku   ?? "");
      setBarcode(initial?.barcode    ?? "");
      setBrand(initial?.brand        ?? "");
      setCategory(initial?.category  ?? "");
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
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl px-3 py-2 text-sm dark:bg-[#1A1A2E] bg-muted/50 border dark:border-white/10 border-border dark:text-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 dark:focus:ring-primary/50 focus:ring-primary/30";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="dark:bg-[#12121C] bg-white border dark:border-primary/20 border-primary/15 rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="dark:text-white text-foreground">
            {isEdit ? "Edit Product" : "Add Product"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">Internal Name *</label>
            <input className={inputCls} placeholder="Nescafe Classic 200g" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">SKU</label>
              <input className={inputCls} placeholder="RSP-001" value={sku} onChange={e => setSku(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">Barcode</label>
              <input className={inputCls} placeholder="6001087013052" value={barcode} onChange={e => setBarcode(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">Brand</label>
              <input className={inputCls} placeholder="Nescafe" value={brand} onChange={e => setBrand(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">Category</label>
              <input className={inputCls} placeholder="Beverages" value={category} onChange={e => setCategory(e.target.value)} />
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

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | undefined>();

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.list({
        search: search || undefined,
        page,
        limit: LIMIT,
      });
      setProducts(res.data);
      setTotal(res.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search]);

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete "${p.internal_name}"? This also removes all its URL mappings.`)) return;
    try {
      await productsApi.delete(p.id);
      toast.success("Product deleted");
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error(msg);
    }
  };

  const openAdd  = () => { setEditTarget(undefined); setFormOpen(true); };
  const openEdit = (p: Product) => { setEditTarget(p); setFormOpen(true); };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white text-foreground">Products</h1>
          <p className="mt-1 text-sm dark:text-muted-foreground text-muted-foreground">
            {total} product{total !== 1 ? "s" : ""} in catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="rounded-xl gap-2 dark:border-primary/30 border-primary/20">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openAdd}
            className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 dark:text-muted-foreground text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, SKU, barcode…"
          className="w-full pl-10 pr-4 py-2 rounded-xl text-sm dark:bg-[#1A1A2E] bg-muted/50 border dark:border-white/10 border-border dark:text-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 dark:focus:ring-primary/50 focus:ring-primary/30"
        />
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
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden sm:table-cell">SKU</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden md:table-cell">Brand</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden lg:table-cell">Category</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden md:table-cell">URLs</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5 divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center dark:text-muted-foreground text-muted-foreground">Loading…</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center dark:text-muted-foreground text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  {search ? "No products match your search" : "No products yet — add one to start"}
                </td></tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} className="dark:hover:bg-white/[0.02] hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium dark:text-white text-foreground">{p.internal_name}</div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="dark:text-muted-foreground text-muted-foreground font-mono text-xs">{p.internal_sku ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="dark:text-muted-foreground text-muted-foreground">{p.brand ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {p.category ? (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs dark:bg-primary/10 bg-primary/5 dark:text-primary text-primary border dark:border-primary/20 border-primary/15">
                          {p.category}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-center">
                      <span className="text-sm font-semibold dark:text-white text-foreground">{p.url_count ?? 0}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs dark:text-emerald-400 text-emerald-600">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs dark:text-muted-foreground text-muted-foreground">
                          <X className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(p)}
                          className="h-8 w-8 rounded-lg dark:text-muted-foreground text-muted-foreground dark:hover:text-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(p)}
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

      <ProductForm
        open={formOpen}
        initial={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
