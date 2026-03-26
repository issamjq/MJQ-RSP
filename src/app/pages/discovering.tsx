import { AppSidebar } from '../components/app-sidebar';
import { Compass, Sparkles, Search, ChevronDown, Check, ArrowRight, Loader2, ExternalLink, DollarSign, Package } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { companiesApi, discoveryApi, urlsApi, scraperApi, snapshotsApi, syncRunsApi } from '../../lib/monitorApi';
import type { Company, DiscoveryMatch, PriceSnapshot } from '../../lib/monitorApi';
import { toast } from 'sonner';

// ── Step 1: Search Form ──────────────────────────────────────────
interface SearchStepProps {
  companies: Company[];
  onResults: (results: Array<{ company: Company; matches: DiscoveryMatch[] }>, query: string) => void;
}

function SearchStep({ companies, onResults }: SearchStepProps) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [searching, setSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );
  const selectedCompanies = companies.filter(c => selectedIds.includes(c.id));

  const toggle = (id: number) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleSearch = async () => {
    if (!query.trim()) { toast.error('Enter a product name'); return; }
    if (selectedIds.length === 0) { toast.error('Select at least one marketplace'); return; }
    setSearching(true);
    try {
      const all = await Promise.all(
        selectedIds.map(async id => {
          const company = companies.find(c => c.id === id)!;
          try {
            const res = await discoveryApi.search(id, query);
            return { company, matches: res.data.results };
          } catch {
            return { company, matches: [] };
          }
        })
      );
      const withResults = all.filter(r => r.matches.length > 0);
      if (withResults.length === 0) { toast.info('No products found. Try a different query.'); }
      else { onResults(withResults, query); }
    } catch {
      toast.error('Discovery failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <h2 className="text-lg font-semibold mb-1">Search for products</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Enter a product name — we'll find it across your selected marketplaces and fetch the price instantly.
      </p>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="e.g. Marvis Classic Whitening Toothpaste"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white text-sm transition-all"
          />
        </div>

        {/* Multi-select company dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-left flex items-center justify-between bg-gray-50 hover:bg-white transition-all text-sm"
          >
            <span className={selectedCompanies.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
              {selectedCompanies.length > 0 ? `${selectedCompanies.length} marketplace${selectedCompanies.length > 1 ? 's' : ''} selected` : 'Select marketplaces…'}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {selectedCompanies.length > 0 && !showDropdown && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedCompanies.map(c => (
                <span key={c.id} className="flex items-center gap-1 px-2.5 py-1 bg-black text-white text-xs rounded-lg">
                  {c.name}
                  <button onClick={() => toggle(c.id)} className="ml-1 hover:text-gray-300">×</button>
                </span>
              ))}
            </div>
          )}

          {showDropdown && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search marketplaces…"
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="max-h-52 overflow-y-auto">
                {filteredCompanies.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { toggle(c.id); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedIds.includes(c.id) ? 'bg-black border-black' : 'border-gray-300'}`}>
                      {selectedIds.includes(c.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-gray-100 flex justify-end">
                <button onClick={() => setShowDropdown(false)} className="px-3 py-1.5 text-xs bg-black text-white rounded-lg">Done</button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSearch}
          disabled={searching || !query.trim() || selectedIds.length === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium text-sm"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {searching ? 'Searching across marketplaces…' : 'Discover & Get Prices'}
        </button>
      </div>
    </div>
  );
}

// ── Price Badge ──────────────────────────────────────────────────
function PriceBadge({ price, currency, loading }: { price?: number | null; currency?: string; loading: boolean }) {
  if (loading) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
      <Loader2 className="w-3 h-3 animate-spin" />
      Getting price…
    </div>
  );
  if (price != null) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm font-semibold text-green-700">
      <DollarSign className="w-3.5 h-3.5" />
      {currency || 'AED'} {price.toFixed(2)}
    </div>
  );
  return (
    <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-muted-foreground">
      No price found
    </div>
  );
}

// ── Step 2: Results + Save + Live Prices ─────────────────────────
interface ResultsStepProps {
  results: Array<{ company: Company; matches: DiscoveryMatch[] }>;
  onBack: () => void;
}

function ResultsStep({ results, onBack }: ResultsStepProps) {
  // selected: "companyId-matchIndex"
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // prices keyed by "companyId-matchIndex" after save
  const [prices, setPrices] = useState<Record<string, PriceSnapshot | null | 'loading'>>({});
  const [runId, setRunId] = useState<number | null>(null);
  const [scrapeProgress, setScrapeProgress] = useState<{ done: number; total: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalNew = results.reduce((s, r) => s + r.matches.filter(m => !m.already_tracked).length, 0);
  const totalFound = results.reduce((s, r) => s + r.matches.length, 0);

  const toggleKey = (key: string) => setSelected(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // Auto-select all new untracked matches with a product match
  useEffect(() => {
    const autoKeys = new Set<string>();
    results.forEach(({ company, matches }) => {
      matches.forEach((m, i) => {
        if (!m.already_tracked && m.match) autoKeys.add(`${company.id}-${i}`);
      });
    });
    setSelected(autoKeys);
  }, [results]);

  // Poll for prices after scrape starts
  useEffect(() => {
    if (!runId) return;
    pollRef.current = setInterval(async () => {
      try {
        const run = await syncRunsApi.get(runId);
        const done = run.data.success_count + run.data.fail_count;
        setScrapeProgress({ done, total: run.data.total_checked || 0 });
        if (run.data.status !== 'running') {
          clearInterval(pollRef.current!);
          // Fetch latest snapshots for all saved product+company combos
          const snap = await snapshotsApi.latest();
          const byKey: Record<string, PriceSnapshot> = {};
          snap.data.forEach(s => {
            // we'll match by product_id + company_id
            byKey[`${s.company_id}-${s.product_id}`] = s;
          });
          setPrices(prev => {
            const next = { ...prev };
            results.forEach(({ company, matches }) => {
              matches.forEach((m, i) => {
                const key = `${company.id}-${i}`;
                if (prev[key] === 'loading' && m.match) {
                  const snap = byKey[`${company.id}-${m.match.product.id}`];
                  next[key] = snap || null;
                }
              });
            });
            return next;
          });
        }
      } catch { clearInterval(pollRef.current!); }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [runId, results]);

  const handleSaveAndScrape = async () => {
    const toSave: Array<{ companyId: number; product_id: number; url: string; image_url?: string | null; key: string }> = [];
    results.forEach(({ company, matches }) => {
      matches.forEach((m, i) => {
        const key = `${company.id}-${i}`;
        if (selected.has(key) && m.match && !m.already_tracked) {
          toSave.push({ companyId: company.id, product_id: m.match.product.id, url: m.found.url, image_url: m.found.imageUrl, key });
        }
      });
    });
    if (toSave.length === 0) { toast.error('Select at least one new product to save'); return; }

    setSaving(true);
    // mark selected as loading prices
    const loadingState: Record<string, 'loading'> = {};
    toSave.forEach(x => { loadingState[x.key] = 'loading'; });
    setPrices(loadingState);

    try {
      // 1. Save URL mappings per company
      const grouped = toSave.reduce((acc, { companyId, product_id, url, image_url }) => {
        if (!acc[companyId]) acc[companyId] = [];
        acc[companyId].push({ product_id, url, image_url });
        return acc;
      }, {} as Record<number, Array<{ product_id: number; url: string; image_url?: string | null }>>);

      let totalAdded = 0;
      for (const [companyId, mappings] of Object.entries(grouped)) {
        const res = await discoveryApi.confirm(Number(companyId), mappings);
        totalAdded += res.data.added;
      }
      toast.success(`Saved ${totalAdded} URL${totalAdded !== 1 ? 's' : ''}. Fetching prices…`);
      setSaved(true);

      // 2. Find the newly created URL IDs and run scrape
      const productIds = [...new Set(toSave.map(x => x.product_id))];
      const companyIds = [...new Set(toSave.map(x => x.companyId))];

      // Query URL IDs for these products/companies
      const urlIds: number[] = [];
      for (const cId of companyIds) {
        const res = await urlsApi.list({ company_id: cId, limit: 500 });
        res.data.forEach(u => {
          if (productIds.includes(u.product_id)) urlIds.push(u.id);
        });
      }

      if (urlIds.length > 0) {
        const scrapeRes = await scraperApi.runMany(urlIds);
        setRunId(scrapeRes.data.run_id);
      }
    } catch {
      toast.error('Failed to save URLs');
      setPrices({});
    } finally {
      setSaving(false);
    }
  };

  const scrapePercent = scrapeProgress
    ? scrapeProgress.total > 0 ? Math.round((scrapeProgress.done / scrapeProgress.total) * 100) : 0
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {saved ? 'Live Price Results' : 'Review & Save'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {totalFound} found · {totalNew} new · {selected.size} selected
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!saved && (
            <button onClick={onBack} className="px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
              ← Back
            </button>
          )}
          {saved ? (
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
              <Search className="w-3.5 h-3.5" />
              Search Again
            </button>
          ) : (
            <button
              onClick={handleSaveAndScrape}
              disabled={saving || selected.size === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Save & Get Prices ({selected.size})
            </button>
          )}
        </div>
      </div>

      {/* Scrape progress bar */}
      {saved && scrapeProgress && scrapeProgress.total > 0 && scrapeProgress.done < scrapeProgress.total && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Fetching prices…
            </div>
            <span className="text-xs text-amber-600">{scrapeProgress.done}/{scrapeProgress.total}</span>
          </div>
          <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${scrapePercent}%` }} />
          </div>
        </div>
      )}

      {/* Results per company */}
      {results.map(({ company, matches }) => (
        <div key={company.id} className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center gap-2">
            <span className="font-semibold text-sm">{company.name}</span>
            <span className="text-xs text-muted-foreground">{matches.length} result{matches.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="divide-y divide-gray-50">
            {matches.map((m, i) => {
              const key = `${company.id}-${i}`;
              const isTracked = m.already_tracked;
              const priceState = prices[key];

              return (
                <div
                  key={key}
                  className={`p-4 flex items-start gap-4 transition-colors ${
                    isTracked ? 'opacity-60' : selected.has(key) ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'
                  }`}
                >
                  {/* Checkbox or check */}
                  <div className="pt-1 shrink-0">
                    {isTracked ? (
                      <div className="w-5 h-5 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-500" />
                      </div>
                    ) : (
                      <button
                        onClick={() => !saved && toggleKey(key)}
                        disabled={saved}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selected.has(key) ? 'bg-black border-black' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {selected.has(key) && <Check className="w-3 h-3 text-white" />}
                      </button>
                    )}
                  </div>

                  {/* Product image */}
                  <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {m.found.imageUrl ? (
                      <img
                        src={m.found.imageUrl}
                        alt={m.found.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Package className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-0.5 leading-snug">{m.found.name}</p>
                    {m.match ? (
                      <p className="text-xs text-muted-foreground mb-1">
                        Matched: <span className="text-foreground">{m.match.product.internal_name}</span>
                        <span className="ml-1.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-medium">
                          {Math.round(m.match.confidence * 100)}% match
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 mb-1">No product match — won't be saved</p>
                    )}
                    <a
                      href={m.found.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                    >
                      View on {company.name} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Price / status */}
                  <div className="shrink-0 text-right">
                    {isTracked ? (
                      <span className="text-xs text-green-600 font-medium">Already tracked</span>
                    ) : priceState !== undefined ? (
                      <PriceBadge
                        loading={priceState === 'loading'}
                        price={priceState !== 'loading' ? priceState?.price : undefined}
                        currency={priceState !== 'loading' ? priceState?.currency : undefined}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export function Discovering() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [results, setResults] = useState<Array<{ company: Company; matches: DiscoveryMatch[] }>>([]);

  useEffect(() => {
    companiesApi.list().then(res => setCompanies(res.data)).catch(() => {});
  }, []);

  const handleResults = (res: Array<{ company: Company; matches: DiscoveryMatch[] }>) => {
    setResults(res);
    setStep(2);
  };

  const steps = [
    { number: 1, title: 'Discover', description: 'Search products' },
    { number: 2, title: 'Results', description: 'Review & get prices' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-1">
            <Compass className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">Discovering</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            AI-powered product discovery — finds URLs and fetches prices in one step
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s.number} className="flex items-center gap-2 shrink-0">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm ${
                  step === s.number
                    ? 'bg-black text-white'
                    : step > s.number
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-white border border-gray-200 text-muted-foreground'
                }`}>
                  {step > s.number
                    ? <Check className="w-4 h-4" />
                    : <span className="font-semibold w-4 text-center">{s.number}</span>
                  }
                  <div>
                    <div className="font-medium leading-none">{s.title}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{s.description}</div>
                  </div>
                </div>
                {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <SearchStep companies={companies} onResults={handleResults} />
          )}

          {step === 2 && (
            <ResultsStep results={results} onBack={() => setStep(1)} />
          )}
        </div>
      </div>
    </div>
  );
}
