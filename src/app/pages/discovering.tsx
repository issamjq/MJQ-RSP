import { AppSidebar } from '../components/app-sidebar';
import { Compass, Sparkles, Search, ChevronDown, Check, Loader2, ExternalLink, CheckCircle2, XCircle, Circle, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { companiesApi, discoveryApi } from '../../lib/monitorApi';
import type { Company, DiscoveryMatch, PriceSnapshot } from '../../lib/monitorApi';
import { toast } from 'sonner';

interface LogStep {
  id: string;
  text: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
  startedAt?: number;
  endedAt?: number;
}

// Strip junk appended to scraped product names (delivery info, stock status, prices, ratings, etc.)
function cleanName(raw: string): string {
  const noisePatterns: RegExp[] = [
    // Delivery / shipping
    /\s*Next[-\s]?Day\s+Delivery\b.*/i,
    /\s*Same[-\s]?Day\s+Delivery\b.*/i,
    /\s*(Express|Standard|Free|Fast)\s+Delivery\b.*/i,
    /\s*Delivery\s*[:\-–].*/i,
    /\s*Order\s+by\b.*/i,
    /\s*Ships?\s+(from|to|within|by|in)\b.*/i,
    /\s*Dispatched\s+(within|in|by)\b.*/i,
    // Stock status
    /\s*Out\s+of\s+Stock\b.*/i,
    /\s*In\s+Stock\b.*/i,
    /\s*Limited\s+Stock\b.*/i,
    /\s*Available\s*(for|to|in|now)\b.*/i,
    // Ratings / reviews
    /\s*Rating\s*[:\-–\(].*/i,
    /\s*\(\s*\d+\s*(Reviews?|Ratings?|Stars?)\s*\).*/i,
    /\s*\d+\s*(Reviews?|Ratings?|Stars?)\b.*/i,
    // Loyalty / rewards
    /\s*Earn\s+up\s+to\b.*/i,
    /\s*Earn\s+\d+\b.*/i,
    /\s*Care\s+Reward\b.*/i,
    /\s*Reward\s+Points?\b.*/i,
    // Prices
    /\s*AED\s*[\d,.]+.*/i,
    /\s*[\$£€]\s*[\d,.]+.*/,
    /\s+\d{1,5}\.\d{2}\b.*/,
    // Promotions / badges
    /\s*[\|\•·–—]\s*.*/,
    /\s*(New|Sale|Hot|Best\s+Seller|Bestseller|Clearance)\b.*/i,
    /\s*\d{1,3}%\s*(Off|Discount|Sale)\b.*/i,
    /\s*Add\s+to\s+(Cart|Bag|Basket|Wishlist)\b.*/i,
    /\s*Buy\s+(Now|Online|Today)\b.*/i,
    // Generic trailing noise starting with unwanted verbs/phrases
    /\s*(Get|Shop|Save|View|Click|Subscribe)\s+.*/i,
  ];

  let result = raw;
  for (const p of noisePatterns) {
    result = result.replace(p, '');
  }
  return result.replace(/\s{2,}/g, ' ').trim();
}

// Extract size/volume from a product name e.g. "75ml", "85g", "1L"
function extractSize(name: string): string | null {
  const m = name.match(/\b(\d+(?:\.\d+)?)\s*(ml|g|mg|kg|oz|l)\b/i);
  return m ? `${m[1]}${m[2].toLowerCase()}` : null;
}

// Returns true when found name and internal name have different measurable sizes
function sizeMismatch(foundName: string, internalName: string): boolean {
  const a = extractSize(foundName);
  const b = extractSize(internalName);
  if (!a || !b) return false;
  return a !== b;
}

function formatDone(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── AI Thinking Log ───────────────────────────────────────────────
function ThinkingLog({ steps, startedAt }: { steps: LogStep[]; startedAt: number }) {
  const isDone = steps.length > 0 && steps.every(s => s.status === 'done' || s.status === 'error');

  const totalTook = isDone && steps.some(s => s.endedAt)
    ? Math.max(...steps.filter(s => s.endedAt).map(s => s.endedAt!)) - startedAt
    : null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 font-mono text-sm shadow-sm">
      <div className="text-gray-400 text-xs mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span className="text-amber-600 font-semibold">AI Discovery Agent</span>
          {!isDone && <span className="text-gray-400">— running</span>}
          {isDone && <span className="text-green-600">— complete</span>}
        </div>
        {isDone && totalTook !== null && (
          <span className="text-green-600 tabular-nums">finished in {formatDone(totalTook)}</span>
        )}
      </div>
      <div className="space-y-2">
        {steps.map(step => {
          const tookMs = step.startedAt && step.endedAt ? step.endedAt - step.startedAt : null;
          return (
            <div key={step.id} className="flex items-start gap-2.5">
              {step.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin mt-0.5 shrink-0" />}
              {step.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />}
              {step.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
              {step.status === 'pending' && <Circle className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />}
              <div className="flex items-baseline gap-2 flex-wrap flex-1">
                <span className={
                  step.status === 'running' ? 'text-amber-600' :
                  step.status === 'done' ? 'text-green-700' :
                  step.status === 'error' ? 'text-red-600' :
                  'text-gray-400'
                }>{step.text}</span>
                {step.detail && <span className="text-gray-400 text-xs">{step.detail}</span>}
              </div>
              {tookMs !== null && (
                <span className="text-gray-400 text-xs shrink-0 tabular-nums ml-2">{formatDone(tookMs)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Price Badge ───────────────────────────────────────────────────
function PriceBadge({ price, loading }: { price?: number | null; loading: boolean }) {
  if (loading) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
      <Loader2 className="w-3 h-3 animate-spin" />
      Getting price…
    </div>
  );
  if (price != null) {
    const n = typeof price === 'number' ? price : parseFloat(String(price));
    return (
      <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm font-semibold text-green-700">
        AED {isNaN(n) ? '—' : n.toFixed(2)}
      </div>
    );
  }
  return (
    <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-muted-foreground">
      No price found
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
type Phase = 'search' | 'processing' | 'review' | 'results';

interface DiscoveryGroup {
  company: Company;
  matches: DiscoveryMatch[];
}

export function Discovering() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [phase, setPhase] = useState<Phase>('search');

  // Search form
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Processing
  const [logSteps, setLogSteps] = useState<LogStep[]>([]);
  const [discoverStartedAt, setDiscoverStartedAt] = useState<number>(0);

  // Results
  const [results, setResults] = useState<DiscoveryGroup[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceSnapshot | null | 'loading'>>({});
  // Review selection: "companyId-matchIndex"
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    companiesApi.list().then(r => setCompanies(r.data)).catch(() => {});
  }, []);

  // Click-outside to close company dropdown
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
  const toggle = (id: number) =>
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // Log helpers
  const addLog = useCallback((id: string, text: string, status: LogStep['status'], detail?: string) => {
    const now = Date.now();
    setLogSteps(prev => {
      if (prev.find(s => s.id === id)) {
        return prev.map(s => s.id === id ? {
          ...s, text, status, detail,
          ...(status === 'running' && !s.startedAt ? { startedAt: now } : {}),
          ...(status === 'done' || status === 'error' ? { endedAt: now } : {}),
        } : s);
      }
      return [...prev, {
        id, text, status, detail,
        startedAt: status === 'running' ? now : undefined,
        endedAt: (status === 'done' || status === 'error') ? now : undefined,
      }];
    });
  }, []);

  const updateLog = useCallback((id: string, status: LogStep['status'], text?: string, detail?: string) => {
    const now = Date.now();
    setLogSteps(prev => prev.map(s =>
      s.id === id ? {
        ...s, status,
        ...(text !== undefined ? { text } : {}),
        ...(detail !== undefined ? { detail } : {}),
        ...(status === 'running' && !s.startedAt ? { startedAt: now } : {}),
        ...(status === 'done' || status === 'error' ? { endedAt: now } : {}),
      } : s
    ));
  }, []);

  const handleDiscover = async () => {
    if (!query.trim()) { toast.error('Enter a product name'); return; }
    if (selectedIds.length === 0) { toast.error('Select at least one marketplace'); return; }

    setPhase('processing');
    setLogSteps([]);
    setResults([]);
    setPrices({});
    setDiscoverStartedAt(Date.now());

    const targetCompanies = companies.filter(c => selectedIds.includes(c.id));

    // ── Step 1: Search ──────────────────────────────────────────
    addLog('init', `Starting discovery for "${query}"`, 'running');

    targetCompanies.forEach(c => {
      addLog(`scan-${c.id}`, `Scanning ${c.name}…`, 'running');
    });

    const allGroups: DiscoveryGroup[] = [];

    await Promise.all(
      targetCompanies.map(async company => {
        const t1 = setTimeout(() =>
          updateLog(`scan-${company.id}`, 'running', `Scanning ${company.name}…`, '⏳ still working…'),
          30000
        );
        const t2 = setTimeout(() =>
          updateLog(`scan-${company.id}`, 'running', `Scanning ${company.name}…`, '⏳ taking longer than usual, be patient…'),
          60000
        );
        try {
          const res = await discoveryApi.search(company.id, query);
          clearTimeout(t1); clearTimeout(t2);
          const matches = res.data.results;
          allGroups.push({ company, matches });
          updateLog(`scan-${company.id}`, 'done',
            `Scanned ${company.name}`,
            `→ ${matches.length} product${matches.length !== 1 ? 's' : ''} found`
          );
        } catch {
          clearTimeout(t1); clearTimeout(t2);
          updateLog(`scan-${company.id}`, 'error', `Scanned ${company.name}`, '→ failed');
        }
      })
    );

    const validGroups = allGroups
      .filter(g => g.matches.length > 0)
      .sort((a, b) => b.matches.length - a.matches.length);

    const totalFound = validGroups.reduce((s, g) => s + g.matches.length, 0);
    updateLog('init', 'done', 'Search complete', `${totalFound} products found across ${validGroups.length} marketplace${validGroups.length !== 1 ? 's' : ''}`);

    if (validGroups.length === 0) {
      addLog('done', 'No products found. Try a different query.', 'error');
      setPhase('search');
      toast.info('No products found.');
      return;
    }

    // ── Step 2: AI Matching (done server-side, brief visual pause) ──
    addLog('match', 'AI matching products to your catalog…', 'running');
    await new Promise(r => setTimeout(r, 500));

    const newCount = validGroups.reduce(
      (s, g) => s + g.matches.filter(m => !m.already_tracked && m.match && !sizeMismatch(m.found.name, m.match.product.internal_name)).length, 0
    );
    const skippedCount = validGroups.reduce(
      (s, g) => s + g.matches.filter(m => !m.already_tracked && m.match && sizeMismatch(m.found.name, m.match.product.internal_name)).length, 0
    );
    const trackedCount = validGroups.reduce(
      (s, g) => s + g.matches.filter(m => m.already_tracked).length, 0
    );
    updateLog('match', 'done', 'AI matching complete',
      `${newCount} new · ${trackedCount} tracked${skippedCount > 0 ? ` · ${skippedCount} size mismatch skipped` : ''}`
    );

    if (newCount === 0) {
      addLog('alldone', 'All found products are already tracked!', 'done');
      setResults(validGroups);
      setPhase('results');
      return;
    }

    // ── Step 3: Transition to review — let user pick what to add ─
    addLog('review', `Ready to review — ${newCount} new product${newCount !== 1 ? 's' : ''} to add`, 'done');

    // Pre-select valid matches (no size mismatch, not already tracked)
    const autoSelected = new Set<string>();
    validGroups.forEach(({ company, matches }) => {
      matches.forEach((m, i) => {
        if (!m.already_tracked && m.match && !sizeMismatch(m.found.name, m.match.product.internal_name)) {
          autoSelected.add(`${company.id}-${i}`);
        }
      });
    });

    setSelected(autoSelected);
    setResults(validGroups);
    setPhase('review');
  };

  const handleSaveSelected = async () => {
    const toSave: Array<{
      companyId: number;
      product_id: number;
      url: string;
      image_url?: string | null;
      price?: number | null;
      original_price?: number | null;
      currency?: string;
      availability?: string;
      key: string;
    }> = [];

    results.forEach(({ company, matches }) => {
      matches.forEach((m, i) => {
        const key = `${company.id}-${i}`;
        if (selected.has(key) && m.match && !m.already_tracked) {
          toSave.push({
            companyId: company.id,
            product_id: m.match.product.id,
            url: m.found.url,
            image_url: m.found.imageUrl,
            price: m.found.price,
            original_price: m.found.original_price,
            currency: m.found.currency,
            availability: m.found.availability,
            key,
          });
        }
      });
    });

    if (toSave.length === 0) { toast.error('Select at least one product'); return; }

    setPhase('results');
    addLog('save', `Saving ${toSave.length} URL${toSave.length !== 1 ? 's' : ''} to monitoring…`, 'running');

    const grouped = toSave.reduce((acc, { companyId, product_id, url, image_url, price, original_price, currency, availability }) => {
      if (!acc[companyId]) acc[companyId] = [];
      acc[companyId].push({ product_id, url, image_url, price, original_price, currency, availability });
      return acc;
    }, {} as Record<number, Array<{ product_id: number; url: string; image_url?: string | null; price?: number | null; original_price?: number | null; currency?: string; availability?: string }>>);

    let savedCount = 0;
    try {
      for (const [cId, mappings] of Object.entries(grouped)) {
        const res = await discoveryApi.confirm(Number(cId), mappings);
        savedCount += res.data.added;
      }
      updateLog('save', 'done', `Saved ${savedCount} URL${savedCount !== 1 ? 's' : ''}`, '');
    } catch {
      updateLog('save', 'error', 'Failed to save URLs', '');
      return;
    }

    // Prices already came from discovery — populate directly, no scrape needed
    const priceMap: Record<string, PriceSnapshot | null> = {};
    toSave.forEach(x => {
      priceMap[x.key] = x.price != null ? {
        id: 0,
        product_id: x.product_id,
        company_id: x.companyId,
        product_company_url_id: null,
        title_found: null,
        price: x.price,
        original_price: x.original_price ?? null,
        currency: x.currency ?? 'AED',
        availability: x.availability ?? 'unknown',
        raw_price_text: null,
        raw_availability_text: null,
        scrape_status: 'success',
        error_message: null,
        checked_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        internal_name: '',
        company_name: '',
        image_url: x.image_url ?? null,
        product_url: x.url,
      } : null;
    });
    setPrices(priceMap);

    addLog('alldone', `Done! ${savedCount} product${savedCount !== 1 ? 's' : ''} added to monitoring.`, 'done');
  };

  const handleNewSearch = () => {
    setPhase('search');
    setResults([]);
    setPrices({});
    setLogSteps([]);
    setSelected(new Set());
  };

  const toggleSelect = (key: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <Compass className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">Discovering</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            AI-powered product discovery — finds, matches, saves, and prices everything in one click
          </p>

          {/* Search card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-5">
            {phase !== 'search' ? (
              /* Compact summary when processing / review / results */
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {phase === 'processing' && <span className="text-amber-600 mr-2">●</span>}
                    {phase === 'review' && <span className="text-blue-500 mr-2">◆</span>}
                    "{query}"
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {selectedCompanies.map(c => c.name).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(phase === 'review' || phase === 'results') && (
                    <button
                      onClick={handleNewSearch}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>New Search</span>
                    </button>
                  )}
                  {phase === 'review' && (
                    <button
                      onClick={handleSaveSelected}
                      disabled={selected.size === 0}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors font-medium"
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Add {selected.size} to Monitoring</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Full search form */
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Search for products</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter a product name — we'll find it, match it to your catalog, save it, and fetch prices. All automatically.
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g. Marvis Classic Whitening Toothpaste"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleDiscover()}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white text-sm transition-all"
                  />
                </div>

                {/* Company multi-select */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-left flex items-center justify-between bg-gray-50 hover:bg-white transition-all text-sm"
                  >
                    <span className={selectedCompanies.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                      {selectedCompanies.length > 0
                        ? `${selectedCompanies.length} marketplace${selectedCompanies.length > 1 ? 's' : ''} selected`
                        : 'Select marketplaces…'}
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
                            onClick={() => toggle(c.id)}
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
                        <button
                          onClick={() => setShowDropdown(false)}
                          className="px-3 py-1.5 text-xs bg-black text-white rounded-lg"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDiscover}
                  disabled={!query.trim() || selectedIds.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Discover & Get Prices
                </button>
              </div>
            )}
          </div>

          {/* AI thinking log */}
          {logSteps.length > 0 && (
            <div className="mb-5">
              <ThinkingLog steps={logSteps} startedAt={discoverStartedAt} />
            </div>
          )}

          {/* Results / Review */}
          {(phase === 'review' || phase === 'results') && results.map(({ company, matches }) => {
            const selectableKeys = matches
              .map((m, i) => ({ m, key: `${company.id}-${i}` }))
              .filter(({ m }) => !m.already_tracked && m.match && !sizeMismatch(m.found.name, m.match.product.internal_name))
              .map(({ key }) => key);
            const allChecked = selectableKeys.length > 0 && selectableKeys.every(k => selected.has(k));

            return (
            <div key={company.id} className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{company.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {matches.length} result{matches.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {phase === 'review' && selectableKeys.length > 0 && (
                  <button
                    onClick={() => {
                      setSelected(prev => {
                        const n = new Set(prev);
                        if (allChecked) selectableKeys.forEach(k => n.delete(k));
                        else selectableKeys.forEach(k => n.add(k));
                        return n;
                      });
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {allChecked ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-50">
                {matches.map((m, i) => {
                  const key = `${company.id}-${i}`;
                  const isTracked = m.already_tracked;
                  const priceState = prices[key];

                  // prefer snapshot image (from scrape) over discovery image
                  const resolvedImage = (priceState && priceState !== 'loading' && priceState.image_url)
                    ? priceState.image_url
                    : m.found.imageUrl ?? null;
                  const isSizeMismatch = !isTracked && m.match
                    ? sizeMismatch(m.found.name, m.match.product.internal_name)
                    : false;

                  return (
                    <div
                      key={key}
                      className={`p-4 flex items-center gap-3 sm:gap-4 transition-colors ${
                        isTracked ? 'opacity-55' : isSizeMismatch ? 'bg-red-50/40' : ''
                      }`}
                    >
                      {/* Image — shown once price or discovery image is available */}
                      {resolvedImage ? (
                        <img
                          src={resolvedImage}
                          alt={cleanName(m.found.name)}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 bg-gray-100"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-12 h-12 shrink-0" />
                      )}

                      {/* Checkbox (review) or status dot (results) */}
                      <div className="shrink-0">
                        {phase === 'review' && !isTracked && !isSizeMismatch && m.match ? (
                          <button
                            onClick={() => toggleSelect(key)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              selected.has(key) ? 'bg-black border-black' : 'border-gray-300 hover:border-gray-500'
                            }`}
                          >
                            {selected.has(key) && <Check className="w-3 h-3 text-white" />}
                          </button>
                        ) : isTracked ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : isSizeMismatch ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : m.match ? (
                          <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-0.5 leading-snug">{cleanName(m.found.name)}</p>
                        {m.match ? (
                          <p className="text-xs text-muted-foreground mb-1">
                            Matched: <span className={isSizeMismatch ? 'text-red-600 line-through' : 'text-foreground'}>{m.match.product.internal_name}</span>
                            {isSizeMismatch ? (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-medium">
                                ⚠ size mismatch — skipped
                              </span>
                            ) : (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-medium">
                                {Math.round(m.match.confidence * 100)}% match
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600 mb-1">No match in catalog</p>
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

                      {/* Price */}
                      <div className="shrink-0 text-right self-center">
                        {isTracked ? (
                          <span className="text-xs text-green-600 font-medium">Already tracked</span>
                        ) : !m.match ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : priceState !== undefined ? (
                          <PriceBadge
                            loading={priceState === 'loading'}
                            price={priceState !== 'loading' ? priceState?.price : undefined}
                          />
                        ) : m.found.price != null ? (
                          <PriceBadge loading={false} price={m.found.price} />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ); })}
        </div>
      </div>
    </div>
  );
}
