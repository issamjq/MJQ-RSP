import { AppSidebar } from '../components/app-sidebar';
import { Compass, Sparkles, Search, ChevronDown, Check, Loader2, ExternalLink, DollarSign, Package, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { companiesApi, discoveryApi, urlsApi, scraperApi, snapshotsApi, syncRunsApi } from '../../lib/monitorApi';
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

// Rough estimate of how long each step takes (ms) — used for ETA
const STEP_ESTIMATES: Record<string, number> = {
  init: 500,
  match: 600,
  save: 1500,
  price: 30000,  // scraping is the longest
  default: 5000, // per marketplace scan
};

function stepEstimate(id: string) {
  if (id.startsWith('scan-')) return STEP_ESTIMATES.default;
  return STEP_ESTIMATES[id] ?? STEP_ESTIMATES.default;
}

function formatEta(ms: number) {
  if (ms <= 0) return 'almost done';
  if (ms < 5000) return `~${Math.ceil(ms / 1000)}s`;
  return `~${Math.ceil(ms / 1000)}s`;
}

function formatDone(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── AI Thinking Log ───────────────────────────────────────────────
function ThinkingLog({ steps, startedAt }: { steps: LogStep[]; startedAt: number }) {
  const [now, setNow] = useState(Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);
  const isDone = steps.length > 0 && steps.every(s => s.status === 'done' || s.status === 'error');

  useEffect(() => {
    if (isDone) return;
    const t = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(t);
  }, [isDone]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [steps]);

  // Compute ETA: sum of estimates for pending + remaining time on running steps
  const eta = (() => {
    if (isDone) return 0;
    let remaining = 0;
    steps.forEach(s => {
      const est = stepEstimate(s.id);
      if (s.status === 'pending') {
        remaining += est;
      } else if (s.status === 'running' && s.startedAt) {
        const elapsed = now - s.startedAt;
        remaining += Math.max(0, est - elapsed);
      }
    });
    return remaining;
  })();

  const totalTook = isDone && steps.some(s => s.endedAt)
    ? Math.max(...steps.filter(s => s.endedAt).map(s => s.endedAt!)) - startedAt
    : null;

  return (
    <div className="bg-gray-950 rounded-2xl p-5 font-mono text-sm">
      <div className="text-gray-500 text-xs mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-amber-400 font-semibold">AI Discovery Agent</span>
          {!isDone && <span className="text-gray-500">— running</span>}
          {isDone && <span className="text-green-500">— complete</span>}
        </div>
        {isDone && totalTook !== null ? (
          <span className="text-green-500 tabular-nums">finished in {formatDone(totalTook)}</span>
        ) : (
          <span className="text-amber-500 tabular-nums">est. {formatEta(eta)} remaining</span>
        )}
      </div>
      <div className="space-y-2">
        {steps.map(step => {
          const tookMs = step.startedAt && step.endedAt ? step.endedAt - step.startedAt : null;

          return (
            <div key={step.id} className="flex items-start gap-2.5">
              {step.status === 'running' && (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin mt-0.5 shrink-0" />
              )}
              {step.status === 'done' && (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
              )}
              {step.status === 'error' && (
                <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              )}
              {step.status === 'pending' && (
                <Circle className="w-3.5 h-3.5 text-gray-600 mt-0.5 shrink-0" />
              )}
              <div className="flex items-baseline gap-2 flex-wrap flex-1">
                <span className={
                  step.status === 'running' ? 'text-amber-300' :
                  step.status === 'done' ? 'text-green-300' :
                  step.status === 'error' ? 'text-red-400' :
                  'text-gray-500'
                }>{step.text}</span>
                {step.detail && (
                  <span className="text-gray-500 text-xs">{step.detail}</span>
                )}
              </div>
              {/* Show took time when done, or est time when pending */}
              {tookMs !== null ? (
                <span className="text-gray-600 text-xs shrink-0 tabular-nums ml-2">
                  {formatDone(tookMs)}
                </span>
              ) : step.status === 'pending' ? (
                <span className="text-gray-700 text-xs shrink-0 tabular-nums ml-2">
                  est. {formatEta(stepEstimate(step.id))}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}

// ── Price Badge ───────────────────────────────────────────────────
function PriceBadge({ price, currency, loading }: { price?: number | null; currency?: string; loading: boolean }) {
  if (loading) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
      <Loader2 className="w-3 h-3 animate-spin" />
      Getting price…
    </div>
  );
  if (price != null) {
    const n = typeof price === 'number' ? price : parseFloat(String(price));
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm font-semibold text-green-700">
        <DollarSign className="w-3.5 h-3.5" />
        {currency || 'AED'} {isNaN(n) ? '—' : n.toFixed(2)}
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
type Phase = 'search' | 'processing' | 'results';

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

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

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
    if (pollRef.current) clearInterval(pollRef.current);

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
        try {
          const res = await discoveryApi.search(company.id, query);
          const matches = res.data.results;
          allGroups.push({ company, matches });
          updateLog(`scan-${company.id}`, 'done',
            `Scanned ${company.name}`,
            `→ ${matches.length} product${matches.length !== 1 ? 's' : ''} found`
          );
        } catch {
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
      (s, g) => s + g.matches.filter(m => !m.already_tracked && m.match).length, 0
    );
    const trackedCount = validGroups.reduce(
      (s, g) => s + g.matches.filter(m => m.already_tracked).length, 0
    );
    updateLog('match', 'done', 'AI matching complete',
      `${newCount} new to track · ${trackedCount} already tracked`
    );

    if (newCount === 0) {
      addLog('alldone', 'All found products are already tracked!', 'done');
      setResults(validGroups);
      setPhase('results');
      return;
    }

    // ── Step 3: Auto-save all new matched URLs ──────────────────
    addLog('save', `Saving ${newCount} new URL${newCount !== 1 ? 's' : ''} to monitoring…`, 'running');

    const toSave: Array<{
      companyId: number;
      product_id: number;
      url: string;
      image_url?: string | null;
      key: string;
    }> = [];

    validGroups.forEach(({ company, matches }) => {
      matches.forEach((m, i) => {
        if (!m.already_tracked && m.match) {
          toSave.push({
            companyId: company.id,
            product_id: m.match.product.id,
            url: m.found.url,
            image_url: m.found.imageUrl,
            key: `${company.id}-${i}`,
          });
        }
      });
    });

    const grouped = toSave.reduce((acc, { companyId, product_id, url, image_url }) => {
      if (!acc[companyId]) acc[companyId] = [];
      acc[companyId].push({ product_id, url, image_url });
      return acc;
    }, {} as Record<number, Array<{ product_id: number; url: string; image_url?: string | null }>>);

    let savedCount = 0;
    try {
      for (const [cId, mappings] of Object.entries(grouped)) {
        const res = await discoveryApi.confirm(Number(cId), mappings);
        savedCount += res.data.added;
      }
      updateLog('save', 'done', `Saved ${savedCount} new URL${savedCount !== 1 ? 's' : ''}`, '');
    } catch {
      updateLog('save', 'error', 'Failed to save URLs', '');
      setResults(validGroups);
      setPhase('results');
      return;
    }

    // ── Step 4: Show results + start price scraping ─────────────
    addLog('price', 'Fetching live prices…', 'running');

    // Mark all new matches as loading price
    const loadingPrices: Record<string, 'loading'> = {};
    toSave.forEach(x => { loadingPrices[x.key] = 'loading'; });
    setPrices(loadingPrices);

    // Show results now, prices will fill in
    setResults(validGroups);
    setPhase('results');

    try {
      const productIds = [...new Set(toSave.map(x => x.product_id))];
      const companyIds = [...new Set(toSave.map(x => x.companyId))];

      // Find newly created URL IDs
      const urlIds: number[] = [];
      for (const cId of companyIds) {
        const res = await urlsApi.list({ company_id: cId, limit: 500 });
        res.data.forEach(u => {
          if (productIds.includes(u.product_id)) urlIds.push(u.id);
        });
      }

      if (urlIds.length === 0) {
        updateLog('price', 'done', 'No URLs to scrape', '');
        return;
      }

      const scrapeRes = await scraperApi.runMany(urlIds);
      const runId = scrapeRes.data.run_id;

      // Poll scrape progress
      pollRef.current = setInterval(async () => {
        try {
          const run = await syncRunsApi.get(runId);
          const done = run.data.success_count + run.data.fail_count;
          const total = run.data.total_checked || urlIds.length;

          updateLog('price', 'running', 'Fetching live prices…', `${done}/${total} checked`);

          if (run.data.status !== 'running') {
            clearInterval(pollRef.current!);
            updateLog('price', 'done', 'Live prices fetched', `${run.data.success_count} successful`);
            addLog('alldone', `Discovery complete! ${savedCount} product${savedCount !== 1 ? 's' : ''} added to monitoring.`, 'done');

            // Load final prices
            const snap = await snapshotsApi.latest();
            const byKey: Record<string, PriceSnapshot> = {};
            snap.data.forEach(s => { byKey[`${s.company_id}-${s.product_id}`] = s; });

            setPrices(prev => {
              const next = { ...prev };
              validGroups.forEach(({ company, matches }) => {
                matches.forEach((m, i) => {
                  const key = `${company.id}-${i}`;
                  if (prev[key] === 'loading' && m.match) {
                    const found = byKey[`${company.id}-${m.match.product.id}`];
                    next[key] = found ?? null;
                  }
                });
              });
              return next;
            });
          }
        } catch {
          clearInterval(pollRef.current!);
          updateLog('price', 'error', 'Price fetch failed', '');
        }
      }, 2000);
    } catch {
      updateLog('price', 'error', 'Failed to start price fetch', '');
    }
  };

  const handleNewSearch = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase('search');
    setResults([]);
    setPrices({});
    setLogSteps([]);
  };

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
              /* Compact summary when processing or done */
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    {phase === 'processing' && <span className="text-amber-600 mr-2">●</span>}
                    "{query}"
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedCompanies.map(c => c.name).join(', ')}
                  </p>
                </div>
                {phase === 'results' && (
                  <button
                    onClick={handleNewSearch}
                    className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    New Search
                  </button>
                )}
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

          {/* Results */}
          {phase === 'results' && results.map(({ company, matches }) => (
            <div key={company.id} className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center gap-2">
                <span className="font-semibold text-sm">{company.name}</span>
                <span className="text-xs text-muted-foreground">
                  {matches.length} result{matches.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-gray-50">
                {matches.map((m, i) => {
                  const key = `${company.id}-${i}`;
                  const isTracked = m.already_tracked;
                  const priceState = prices[key];

                  return (
                    <div
                      key={key}
                      className={`p-4 flex items-start gap-3 sm:gap-4 transition-colors ${isTracked ? 'opacity-55' : ''}`}
                    >
                      {/* Status dot */}
                      <div className="pt-1 shrink-0">
                        {isTracked ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : m.match ? (
                          <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                        )}
                      </div>

                      {/* Image */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
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
      </div>
    </div>
  );
}
