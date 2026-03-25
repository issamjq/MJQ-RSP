import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { BarChart2, RefreshCw, TrendingDown, TrendingUp, Minus, ExternalLink, Download } from "lucide-react";
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

function PriceCell({ snap }: { snap: PriceSnapshot }) {
  if (snap.price === null) return <span className="text-xs dark:text-muted-foreground text-muted-foreground">—</span>;
  const hasDiscount = snap.original_price !== null && snap.original_price > snap.price;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-semibold dark:text-white text-foreground">
        {snap.currency} {Number(snap.price).toFixed(2)}
      </span>
      {hasDiscount && (
        <span className="text-[11px] line-through dark:text-muted-foreground/60 text-muted-foreground/60">
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
    // Wait for external images (CDN) to load before printing
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

  // Render as a portal directly on document.body (outside #root)
  // so we can safely display:none #root without hiding the print content
  return createPortal(
    <>
      <style>{`
        @media print {
          #root { display: none !important; }
          #pdf-print-root { display: block !important; }
          @page { margin: 10mm; size: A4 portrait; }
          #pdf-print-root * { box-sizing: border-box !important; }
        }
        #pdf-print-root { display: none; }
      `}</style>

      {/* width: 190mm = A4 (210mm) minus 2×10mm margins — renders at true A4 size, no scaling */}
      <div id="pdf-print-root" style={{ width: "190mm", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "9pt", color: "#111827" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3mm", borderBottom: "2px solid #6E76FF", paddingBottom: "2mm" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="28" height="28" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="38" height="38" rx="12" fill="#6E76FF"/>
              <rect x="9" y="9" width="20" height="20" rx="8" fill="#ffffff"/>
              <rect x="12" y="12" width="14" height="3.6" rx="2" fill="#6E76FF"/>
              <rect x="12" y="17" width="14" height="3.6" rx="2" fill="#A78BFA"/>
              <rect x="12" y="22" width="14" height="3.6" rx="2" fill="#111827"/>
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

        {/* Cards grid — two equal columns using a table-like approach for reliable print rendering */}
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

  const totalPages = Math.ceil(total / LIMIT);

  const selectCls = "rounded-xl px-3 py-2 text-sm dark:bg-[#1A1A2E] bg-muted/50 border dark:border-white/10 border-border dark:text-white text-foreground focus:outline-none focus:ring-1 dark:focus:ring-primary/50 focus:ring-primary/30";

  const tabBtnCls = (active: boolean) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "dark:text-primary text-primary dark:border-primary border-primary"
        : "dark:text-muted-foreground text-muted-foreground border-transparent dark:hover:text-foreground hover:text-foreground"
    }`;

  const successSnaps = snapshots.filter(s => s.scrape_status === "success");

  return (
    <div className="space-y-6">
      {/* PDF Print View — only visible during print */}
      {showPdf && (
        <PdfPrintView
          snapshots={successSnaps}
          onClose={() => setShowPdf(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white text-foreground">Price Snapshots</h1>
          <p className="mt-1 text-sm dark:text-muted-foreground text-muted-foreground">
            {tab === "latest" ? "Latest price per product per company" : `${total} total snapshots`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPdf(true)}
            disabled={loading || successSnaps.length === 0}
            title={`Export ${successSnaps.length} successfully scraped snapshot${successSnaps.length !== 1 ? "s" : ""} as PDF`}
            className="rounded-xl gap-2 dark:border-primary/30 border-primary/20"
          >
            <Download className="h-4 w-4" />
            Export PDF {successSnaps.length > 0 && `(${successSnaps.length})`}
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="rounded-xl gap-2 dark:border-primary/30 border-primary/20">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
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
                      <PriceCell snap={snap} />
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
