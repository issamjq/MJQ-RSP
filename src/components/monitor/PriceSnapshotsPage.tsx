import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { BarChart2, RefreshCw, ExternalLink, Download, Trash2 } from "lucide-react";
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
  if (avail === "in_stock")     return <span className="text-xs text-emerald-600 font-medium">In Stock</span>;
  if (avail === "out_of_stock") return <span className="text-xs text-red-500 font-medium">Out of Stock</span>;
  return <span className="text-xs text-muted-foreground">{avail || "—"}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success:  "bg-emerald-100 text-emerald-700 border-emerald-200",
    error:    "bg-red-100 text-red-700 border-red-200",
    timeout:  "bg-amber-100 text-amber-700 border-amber-200",
    no_price: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${map[status] ?? map.no_price}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function PriceCell({ snap }: { snap: PriceSnapshot }) {
  if (snap.price === null) return <span className="text-xs text-muted-foreground">—</span>;
  const hasDiscount = snap.original_price !== null && snap.original_price > snap.price;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-semibold text-foreground">
        {snap.currency} {Number(snap.price).toFixed(2)}
      </span>
      {hasDiscount && (
        <span className="text-[11px] line-through text-muted-foreground/60">
          {snap.currency} {Number(snap.original_price).toFixed(2)}
        </span>
      )}
    </div>
  );
}

// ── PDF Print View ─────────────────────────────────────────────────

function PdfPrintView({ snapshots, onClose }: { snapshots: PriceSnapshot[]; onClose: () => void }) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (printedRef.current) return;
    printedRef.current = true;
    const timer = setTimeout(() => {
      window.print();
      onClose();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onClose]);

  const now = new Date().toLocaleDateString("en-AE", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return createPortal(
    <>
      <style>{`
        @media print {
          #root { display: none !important; }
          #pdf-print-root {
            position: static !important;
            left: auto !important;
            top: auto !important;
            visibility: visible !important;
          }
          @page { margin: 10mm; size: A4 portrait; }
          #pdf-print-root * { box-sizing: border-box !important; }
        }
        #pdf-print-root {
          position: absolute;
          left: -9999px;
          top: 0;
          width: 190mm;
          visibility: hidden;
        }
      `}</style>

      <div id="pdf-print-root" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "9pt", color: "#111827" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3mm", borderBottom: "2px solid #1a1a1a", paddingBottom: "2mm" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="28" height="28" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="38" height="38" rx="12" fill="#1a1a1a"/>
              <rect x="14" y="14" width="10" height="10" rx="2" fill="#ffffff" transform="rotate(45 19 19)"/>
            </svg>
            <div>
              <div style={{ fontSize: "13pt", fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>Price Report — MJQ App</div>
              <div style={{ fontSize: "8pt", color: "#6b7280" }}>Generated: {now}</div>
            </div>
          </div>
          <div style={{ fontSize: "8pt", color: "#6b7280" }}>
            {snapshots.length} product{snapshots.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5mm", width: "100%" }}>
          {snapshots.map(snap => {
            const hasDiscount = snap.original_price !== null && snap.original_price > (snap.price ?? 0);
            return (
              <div key={snap.id} style={{
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                padding: "2mm",
                display: "flex",
                gap: "2mm",
                alignItems: "flex-start",
                breakInside: "avoid",
                boxSizing: "border-box",
                minWidth: 0,
              }}>
                {/* Product image */}
                <div style={{ flexShrink: 0, width: "12mm", height: "12mm", borderRadius: "4px", overflow: "hidden", background: "#f9fafb", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {snap.image_url
                    ? <img src={snap.image_url} alt="" style={{ width: "12mm", height: "12mm", objectFit: "contain" }} />
                    : <span style={{ fontSize: "16pt" }}>📦</span>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <div style={{ fontWeight: 700, fontSize: "8.5pt", color: "#111827", marginBottom: "1mm", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {snap.internal_name}
                  </div>
                  {snap.title_found && snap.title_found !== snap.internal_name && (
                    <div style={{ fontSize: "7pt", color: "#9ca3af", marginBottom: "1mm", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {snap.title_found}
                    </div>
                  )}
                  <div style={{ fontSize: "7.5pt", color: "#6b7280", marginBottom: "1.5mm", fontStyle: "italic" }}>
                    {snap.company_name}
                  </div>

                  {/* Price row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "2mm", flexWrap: "wrap" }}>
                    {snap.price !== null ? (
                      <>
                        <span style={{ fontWeight: 700, fontSize: "10pt", color: hasDiscount ? "#dc2626" : "#111827" }}>
                          {snap.currency} {Number(snap.price).toFixed(2)}
                        </span>
                        {hasDiscount && (
                          <span style={{ fontSize: "7.5pt", color: "#9ca3af", textDecoration: "line-through" }}>
                            {snap.currency} {Number(snap.original_price).toFixed(2)}
                          </span>
                        )}
                        {hasDiscount && (
                          <span style={{ fontSize: "7pt", background: "#fee2e2", color: "#dc2626", padding: "0 2mm", borderRadius: "3px", fontWeight: 700 }}>
                            -{Math.round((1 - snap.price / snap.original_price!) * 100)}%
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: "8pt", color: "#9ca3af" }}>No price</span>
                    )}
                  </div>

                  {/* Availability + date */}
                  <div style={{ display: "flex", alignItems: "center", gap: "2mm", marginTop: "1.5mm", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "7pt", fontWeight: 700, padding: "0 2mm", borderRadius: "3px",
                      background: snap.availability === "in_stock" ? "#dcfce7" : snap.availability === "out_of_stock" ? "#fee2e2" : "#f3f4f6",
                      color: snap.availability === "in_stock" ? "#16a34a" : snap.availability === "out_of_stock" ? "#dc2626" : "#6b7280",
                    }}>
                      {snap.availability === "in_stock" ? "In Stock" : snap.availability === "out_of_stock" ? "Out of Stock" : snap.availability || "Unknown"}
                    </span>
                    <span style={{ fontSize: "7pt", color: "#9ca3af" }}>{formatDate(snap.checked_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "3mm", paddingTop: "2mm", borderTop: "1px solid #e5e7eb", fontSize: "7pt", color: "#9ca3af", textAlign: "center" }}>
          MJQ App — Price Monitoring Report · {now}
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Latest Prices Card ─────────────────────────────────────────────

function LatestPriceCard({ snap, onDelete }: { snap: PriceSnapshot; onDelete: (id: number) => void }) {
  const hasDiscount = snap.original_price !== null && snap.original_price > (snap.price ?? 0);
  const discountPct = hasDiscount
    ? Math.round((1 - snap.price! / snap.original_price!) * 100)
    : 0;

  return (
    <div className="group relative bg-white rounded-xl border border-gray-100 p-4 flex gap-4 items-start transition-all duration-200 hover:shadow-md">

      {/* Image */}
      <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
        {snap.image_url
          ? <img src={snap.image_url} alt="" className="w-full h-full object-contain" />
          : <BarChart2 className="h-6 w-6 text-muted-foreground/30" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground leading-snug truncate">{snap.internal_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{snap.company_name}</p>
          </div>
          {/* Delete button — appears on hover */}
          <button
            onClick={() => onDelete(snap.id)}
            title="Delete this snapshot"
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-2 flex-wrap">
          {snap.price !== null ? (
            <>
              <span className={`text-lg font-bold tracking-tight ${hasDiscount ? "text-emerald-600" : "text-foreground"}`}>
                {snap.currency} {Number(snap.price).toFixed(2)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-sm line-through text-muted-foreground/50">
                    {snap.currency} {Number(snap.original_price).toFixed(2)}
                  </span>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                    -{discountPct}%
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground italic">No price captured</span>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between mt-2 flex-wrap gap-x-3 gap-y-1">
          <div className="flex items-center gap-2">
            <AvailBadge avail={snap.availability} />
            <StatusBadge status={snap.scrape_status} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">
              {formatDate(snap.checked_at)}
            </span>
            {snap.product_url && (
              <a href={snap.product_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-gray-400 hover:text-gray-700 transition-colors"
                title="Open in store">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
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
  const [showPdf,    setShowPdf]    = useState(false);

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

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this price snapshot?")) return;
    try {
      await snapshotsApi.delete(id);
      toast.success("Snapshot deleted");
      setSnapshots(prev => prev.filter(s => s.id !== id));
      setTotal(t => t - 1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const selectCls = "rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 text-foreground focus:outline-none focus:ring-2 focus:ring-black/5";
  const tabBtnCls = (active: boolean) =>
    `px-4 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "border-b-2 border-black text-black"
        : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
    }`;

  const successSnaps = snapshots.filter(s => s.scrape_status === "success");

  return (
    <div className="space-y-6">
      {showPdf && <PdfPrintView snapshots={successSnaps} onClose={() => setShowPdf(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Prices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "latest"
              ? `${snapshots.length} latest successful price${snapshots.length !== 1 ? "s" : ""} — one per product per store`
              : `${total} total snapshots in history`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowPdf(true)}
            disabled={loading || successSnaps.length === 0}
            title={`Export ${successSnaps.length} snapshot${successSnaps.length !== 1 ? "s" : ""} as PDF`}
            className="rounded-lg gap-2 bg-black text-white hover:bg-gray-800">
            <Download className="h-4 w-4" />
            Export PDF {successSnaps.length > 0 && `(${successSnaps.length})`}
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="rounded-lg gap-2 border-gray-200 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-1">
        <button className={tabBtnCls(tab === "latest")} onClick={() => setTab("latest")}>
          Latest Prices
        </button>
        <button className={tabBtnCls(tab === "all")} onClick={() => setTab("all")}>
          Full History
        </button>
      </div>

      {/* Tab description */}
      <div className="rounded-xl px-4 py-2.5 bg-amber-50/50 border border-amber-100 text-xs text-amber-800">
        {tab === "latest"
          ? "Shows the most recent successful scrape for each product × store combination. This is your live price board."
          : "Every scrape ever recorded, newest first. Use the filters to drill into a specific product or store."}
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

      {/* Latest Prices — card grid */}
      {tab === "latest" && (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl h-28 bg-gray-50 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : snapshots.length === 0 ? (
          <div className="rounded-xl border border-gray-100 py-16 flex flex-col items-center gap-3 bg-white">
            <BarChart2 className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No prices yet — run a scrape to collect data</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {snapshots.map(snap => (
              <LatestPriceCard key={snap.id} snap={snap} onDelete={handleDelete} />
            ))}
          </div>
        )
      )}

      {/* Full History — table */}
      {tab === "all" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Company</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Price</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Stock</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Checked At</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">Loading…</td></tr>
                ) : snapshots.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No snapshots match your filters
                  </td></tr>
                ) : (
                  snapshots.map(snap => (
                    <tr key={snap.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {snap.image_url
                            ? <img src={snap.image_url} alt="" className="h-8 w-8 rounded-lg object-contain shrink-0 bg-gray-50 border border-gray-100" />
                            : <div className="h-8 w-8 rounded-lg shrink-0 bg-gray-50 border border-gray-100" />
                          }
                          <span className="font-medium text-foreground text-sm truncate max-w-[160px]">{snap.internal_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-sm">{snap.company_name}</td>
                      <td className="px-6 py-3 text-right"><PriceCell snap={snap} /></td>
                      <td className="px-6 py-3 hidden sm:table-cell"><AvailBadge avail={snap.availability} /></td>
                      <td className="px-6 py-3">
                        <StatusBadge status={snap.scrape_status} />
                        {snap.error_message && (
                          <p className="text-[10px] text-red-500 mt-0.5 max-w-[120px] truncate" title={snap.error_message}>{snap.error_message}</p>
                        )}
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(snap.checked_at)}</span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {snap.product_url && (
                            <a href={snap.product_url} target="_blank" rel="noreferrer"
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-gray-900 hover:bg-gray-100 transition-colors">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button onClick={() => handleDelete(snap.id)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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
    </div>
  );
}
