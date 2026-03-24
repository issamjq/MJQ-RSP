import { useState, useRef, useEffect } from "react";
import { Search, ArrowLeft, Loader2, Sparkles, ChevronDown, X } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner@2.0.3";
import {
  discoveryApi,
  type Company,
  type Product,
  type DiscoveryMatch,
} from "../../lib/monitorApi";

// ── Confidence Badge ────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) return <span className="text-xs dark:text-muted-foreground text-muted-foreground">—</span>;
  const pct = Math.round(confidence * 100);
  let cls: string;
  if (confidence >= 0.8)      cls = "dark:bg-emerald-500/15 bg-emerald-100 dark:text-emerald-400 text-emerald-700 dark:border-emerald-500/30 border-emerald-200";
  else if (confidence >= 0.6) cls = "dark:bg-amber-500/15 bg-amber-100 dark:text-amber-400 text-amber-700 dark:border-amber-500/30 border-amber-200";
  else                         cls = "dark:bg-red-500/15 bg-red-100 dark:text-red-400 text-red-700 dark:border-red-500/30 border-red-200";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cls}`}>
      {pct}%
    </span>
  );
}

// ── Enriched match includes company context ─────────────────────────

interface EnrichedMatch extends DiscoveryMatch {
  companyId: number;
  companyName: string;
}

// ── Props ───────────────────────────────────────────────────────────

interface DiscoverModalProps {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  products: Product[];
  onAdded: () => void;
}

// ── Company Search Picker ───────────────────────────────────────────

function CompanyPicker({
  companies,
  value,
  onChange,
  disabled,
}: {
  companies: Company[];
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  const [search, setSearch]   = useState("");
  const [open,   setOpen]     = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);

  const selected = companies.find((c) => c.id === value) ?? null;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = "w-full rounded-xl px-3 py-2 text-sm dark:bg-[#1A1A2E] bg-muted/50 border dark:border-white/10 border-border dark:text-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 dark:focus:ring-primary/50 focus:ring-primary/30";

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          className={inputCls + " pr-8"}
          placeholder="Search company…"
          value={selected && !open ? selected.name : search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); onChange(null); }}
          onFocus={() => { setSearch(""); setOpen(true); }}
          disabled={disabled}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 dark:text-muted-foreground text-muted-foreground"
          onClick={() => { if (selected) { onChange(null); setSearch(""); } else { setOpen((o) => !o); } }}
          disabled={disabled}
        >
          {selected ? <X className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border dark:border-white/10 border-border dark:bg-[#1A1A2E] bg-white shadow-xl max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs dark:text-muted-foreground text-muted-foreground">No companies found</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm dark:hover:bg-white/5 hover:bg-muted/50 transition-colors ${c.id === value ? "dark:text-primary text-primary font-medium" : "dark:text-white text-foreground"}`}
                onClick={() => { onChange(c.id); setSearch(""); setOpen(false); }}
              >
                {c.name}
                {!c.is_active && <span className="ml-2 text-[10px] dark:text-muted-foreground text-muted-foreground">(inactive)</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────

export function DiscoverModal({ open, onClose, companies, products, onAdded }: DiscoverModalProps) {
  const [step,              setStep]              = useState<1 | 2>(1);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [query,             setQuery]             = useState("");
  const [loading,           setLoading]           = useState(false);
  const [results,           setResults]           = useState<EnrichedMatch[]>([]);
  const [totalFound,        setTotalFound]        = useState(0);
  const [progressLabel,     setProgressLabel]     = useState("");

  const [selectedOverrides, setSelectedOverrides] = useState<Record<number, number | null>>({});
  const [checked,           setChecked]           = useState<Set<number>>(new Set());
  const [confirming,        setConfirming]        = useState(false);

  // Show results grouped by company?
  const multiCompany = results.length > 0 && new Set(results.map((r) => r.companyId)).size > 1;

  if (!open) return null;

  const activeCompanies = companies.filter((c) => c.is_active);

  const inputCls = "w-full rounded-xl px-3 py-2 text-sm dark:bg-[#1A1A2E] bg-muted/50 border dark:border-white/10 border-border dark:text-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 dark:focus:ring-primary/50 focus:ring-primary/30";

  // ── Run for one company ───────────────────────────────────────────

  const runDiscovery = async (companyId: number, q: string): Promise<EnrichedMatch[]> => {
    const res       = await discoveryApi.search(companyId, q);
    const discovery = res.data;
    const company   = companies.find((c) => c.id === companyId);
    return discovery.results.map((r) => ({
      ...r,
      companyId,
      companyName: company?.name ?? `Company ${companyId}`,
    }));
  };

  // ── Step 1: Discover one company ──────────────────────────────────

  const handleDiscover = async () => {
    if (!selectedCompanyId) { toast.error("Please select a company"); return; }
    if (!query.trim())       { toast.error("Please enter a search query"); return; }
    setLoading(true);
    setProgressLabel("");
    try {
      const enriched = await runDiscovery(selectedCompanyId, query.trim());
      setResults(enriched);
      setTotalFound(enriched.length);
      initChecked(enriched);
      setSelectedOverrides({});
      setStep(2);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: Discover ALL active companies ─────────────────────────

  const handleDiscoverAll = async () => {
    if (!query.trim()) { toast.error("Please enter a search query"); return; }
    if (activeCompanies.length === 0) { toast.error("No active companies"); return; }

    setLoading(true);
    const allResults: EnrichedMatch[] = [];

    for (let i = 0; i < activeCompanies.length; i++) {
      const company = activeCompanies[i];
      setProgressLabel(`Searching ${company.name} (${i + 1}/${activeCompanies.length})…`);
      try {
        const enriched = await runDiscovery(company.id, query.trim());
        allResults.push(...enriched);
      } catch {
        // skip failed companies silently — they show as 0 results
      }
    }

    setLoading(false);
    setProgressLabel("");
    setResults(allResults);
    setTotalFound(allResults.length);
    initChecked(allResults);
    setSelectedOverrides({});
    setStep(2);
  };

  const initChecked = (enriched: EnrichedMatch[]) => {
    const initialChecked = new Set<number>();
    enriched.forEach((r, i) => {
      if (r.match && !r.already_tracked) initialChecked.add(i);
    });
    setChecked(initialChecked);
  };

  // ── Step 2: Confirm selections ────────────────────────────────────

  const handleConfirm = async () => {
    // Group mappings by companyId
    const byCompany = new Map<number, Array<{ product_id: number; url: string; image_url?: string | null }>>();

    checked.forEach((i) => {
      const result = results[i];
      if (!result || result.already_tracked) return;
      const overrideId = i in selectedOverrides ? selectedOverrides[i] : undefined;
      const productId  = overrideId !== undefined ? overrideId : (result.match?.product?.id ?? null);
      if (productId !== null && result.found.url) {
        if (!byCompany.has(result.companyId)) byCompany.set(result.companyId, []);
        byCompany.get(result.companyId)!.push({ product_id: productId, url: result.found.url, image_url: result.found.imageUrl ?? null });
      }
    });

    if (byCompany.size === 0) { toast.error("No valid mappings selected"); return; }

    setConfirming(true);
    try {
      let totalAdded = 0;
      for (const [companyId, mappings] of byCompany) {
        const res = await discoveryApi.confirm(companyId, mappings);
        totalAdded += res.data.added;
      }
      toast.success(`Added ${totalAdded} URL mapping${totalAdded !== 1 ? "s" : ""}`);
      onAdded();
      handleClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save mappings");
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedCompanyId(null);
    setQuery("");
    setResults([]);
    setTotalFound(0);
    setSelectedOverrides({});
    setChecked(new Set());
    setProgressLabel("");
    onClose();
  };

  const checkedCount = Array.from(checked).filter((i) => !results[i]?.already_tracked).length;

  // ── Select / deselect all untracked ──────────────────────────────

  const untrackedIndices = results.map((r, i) => ({ r, i })).filter(({ r }) => !r.already_tracked && r.match).map(({ i }) => i);
  const allChecked = untrackedIndices.length > 0 && untrackedIndices.every((i) => checked.has(i));

  const toggleSelectAll = () => {
    if (allChecked) {
      setChecked((prev) => { const s = new Set(prev); untrackedIndices.forEach((i) => s.delete(i)); return s; });
    } else {
      setChecked((prev) => { const s = new Set(prev); untrackedIndices.forEach((i) => s.add(i)); return s; });
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div
        className="relative w-full max-w-4xl dark:bg-[#12121C] bg-white border dark:border-primary/20 border-primary/15 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Step 1: Setup ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold dark:text-white text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Auto-Discover Products
              </h2>
              <p className="mt-1.5 text-sm dark:text-muted-foreground text-muted-foreground">
                Search one retailer or all at once — Claude AI matches found products to your catalog.
              </p>
            </div>

            <div className="space-y-4">
              {/* Search query */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">
                  Search Query <span className="dark:text-muted-foreground/60 text-muted-foreground/60 font-normal">(any brand or product name)</span>
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g. marvis, dove, colgate…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={loading}
                  onKeyDown={(e) => e.key === "Enter" && selectedCompanyId && handleDiscover()}
                />
              </div>

              {/* Company picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">
                  Company <span className="dark:text-muted-foreground/60 text-muted-foreground/60">(leave blank to search all)</span>
                </label>
                <CompanyPicker
                  companies={companies}
                  value={selectedCompanyId}
                  onChange={setSelectedCompanyId}
                  disabled={loading}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 py-4 dark:text-muted-foreground text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">{progressLabel || "Searching…"}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 pt-2">
                <Button variant="ghost" onClick={handleClose} className="rounded-xl shrink-0">
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDiscoverAll}
                  disabled={!query.trim()}
                  className="rounded-xl gap-2 flex-1"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  Discover All Companies
                </Button>
                <Button
                  onClick={handleDiscover}
                  disabled={!selectedCompanyId || !query.trim()}
                  className="rounded-xl gap-2 flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  <Search className="h-4 w-4" />
                  Discover
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Results ──────────────────────────────────────── */}
        {step === 2 && (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b dark:border-white/5 border-border shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold dark:text-white text-foreground">
                    {totalFound} product{totalFound !== 1 ? "s" : ""} found
                    {multiCompany ? ` across ${new Set(results.map((r) => r.companyId)).size} companies` : ` on ${results[0]?.companyName ?? ""}`}
                  </h2>
                  <p className="mt-0.5 text-xs dark:text-muted-foreground text-muted-foreground">
                    Query: "{query}" · {untrackedIndices.length} new to add
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="h-8 w-8 flex items-center justify-center rounded-lg dark:text-muted-foreground text-muted-foreground dark:hover:text-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1 min-h-0">
              {results.length === 0 ? (
                <div className="px-6 py-12 text-center dark:text-muted-foreground text-muted-foreground text-sm">
                  No products found. Try a different query.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 dark:bg-[#12121C] bg-white z-10">
                    <tr className="border-b dark:border-white/5 border-border">
                      {multiCompany && (
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">
                          Company
                        </th>
                      )}
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">
                        Found Product
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">
                        Matched To
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">
                        Conf.
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">
                        <button
                          onClick={toggleSelectAll}
                          className="underline underline-offset-2 hover:text-primary transition-colors"
                          title={allChecked ? "Deselect all" : "Select all"}
                        >
                          {allChecked ? "None" : "All"}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-white/5 divide-border">
                    {results.map((r, i) => {
                      const overrideId       = i in selectedOverrides ? selectedOverrides[i] : undefined;
                      const effectiveProduct =
                        overrideId !== undefined
                          ? (overrideId !== null ? products.find((p) => p.id === overrideId) ?? null : null)
                          : r.match?.product ?? null;
                      const confidence =
                        overrideId !== undefined
                          ? (overrideId !== null ? r.match?.confidence ?? null : null)
                          : r.match?.confidence ?? null;

                      return (
                        <tr
                          key={i}
                          className={`dark:hover:bg-white/[0.02] hover:bg-muted/30 transition-colors ${r.already_tracked ? "opacity-50" : ""}`}
                        >
                          {multiCompany && (
                            <td className="px-5 py-3 whitespace-nowrap">
                              <span className="text-xs dark:text-muted-foreground text-muted-foreground font-medium">
                                {r.companyName}
                              </span>
                            </td>
                          )}

                          {/* Found product */}
                          <td className="px-5 py-3 max-w-[200px]">
                            <div className="font-medium dark:text-white text-foreground text-sm leading-snug">
                              {r.found.name}
                            </div>
                            <a
                              href={r.found.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] dark:text-primary/60 text-primary/70 hover:underline truncate block max-w-[180px] mt-0.5"
                            >
                              {r.found.url}
                            </a>
                          </td>

                          {/* Match dropdown */}
                          <td className="px-5 py-3 min-w-[160px]">
                            {r.already_tracked ? (
                              <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border dark:bg-zinc-500/15 bg-zinc-100 dark:text-zinc-400 text-zinc-600 dark:border-zinc-500/30 border-zinc-200">
                                Already tracked
                              </span>
                            ) : (
                              <select
                                className="rounded-lg px-2 py-1.5 text-xs dark:bg-[#1A1A2E] bg-muted/50 border dark:border-white/10 border-border dark:text-white text-foreground focus:outline-none w-full"
                                value={overrideId !== undefined ? (overrideId ?? "") : (effectiveProduct?.id ?? "")}
                                onChange={(e) => {
                                  const val = e.target.value ? parseInt(e.target.value) : null;
                                  setSelectedOverrides((prev) => ({ ...prev, [i]: val }));
                                  setChecked((prev) => {
                                    const s = new Set(prev);
                                    if (val !== null) s.add(i); else s.delete(i);
                                    return s;
                                  });
                                }}
                              >
                                <option value="">— No match —</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>{p.internal_name}</option>
                                ))}
                              </select>
                            )}
                          </td>

                          {/* Confidence */}
                          <td className="px-5 py-3">
                            <ConfidenceBadge confidence={r.already_tracked ? null : confidence} />
                          </td>

                          {/* Checkbox */}
                          <td className="px-5 py-3 text-center">
                            {r.already_tracked ? null : (
                              <input
                                type="checkbox"
                                className="rounded cursor-pointer accent-primary"
                                checked={checked.has(i)}
                                onChange={(e) => {
                                  setChecked((prev) => {
                                    const s = new Set(prev);
                                    if (e.target.checked) s.add(i); else s.delete(i);
                                    return s;
                                  });
                                }}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t dark:border-white/5 border-border flex items-center justify-between shrink-0">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="rounded-xl gap-2 dark:text-muted-foreground text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={checkedCount === 0 || confirming}
                className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-white"
              >
                {confirming
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : `Add Selected (${checkedCount})`
                }
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
