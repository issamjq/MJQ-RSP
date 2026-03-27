import { AppSidebar } from '../components/app-sidebar';
import { Compass, Sparkles, Search, ChevronDown, Check, Loader2, ExternalLink, CheckCircle2, XCircle, Circle, AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDiscovery, sizeMismatch } from '../contexts/discovery-context';
import type { LogStep, Phase } from '../contexts/discovery-context';

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

function formatDone(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m} min ${rem} sec` : `${m} min`;
}

// ── AI Thinking Log ───────────────────────────────────────────────
function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m} min ${rem} sec` : `${m} min`;
}

function ThinkingLog({ steps, startedAt }: { steps: LogStep[]; startedAt: number }) {
  const isDone = steps.length > 0 && steps.every(s => s.status === 'done' || s.status === 'error');
  const [, setTick] = useState(0);

  useEffect(() => {
    if (isDone) return;
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [isDone]);

  const elapsedMs = !isDone && startedAt ? Date.now() - startedAt : null;

  const totalTook = isDone && steps.some(s => s.endedAt)
    ? Math.max(...steps.filter(s => s.endedAt).map(s => s.endedAt!)) - startedAt
    : null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 font-mono text-sm shadow-sm">
      <div className="text-yellow-600 text-xs mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-foreground" />
          <span className="font-semibold text-foreground">AI Discovery Agent</span>
          {!isDone && <span className="text-yellow-600">— running</span>}
          {isDone && <span className="text-green-600">— complete</span>}
        </div>
        <div className="flex items-center gap-3">
          {!isDone && elapsedMs !== null && (
            <span className="text-yellow-600 tabular-nums text-xs">{formatElapsed(elapsedMs)}</span>
          )}
          {isDone && totalTook !== null && (
            <span className="text-green-600 tabular-nums">finished in {formatDone(totalTook)}</span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {steps.map(step => {
          const tookMs = step.startedAt && step.endedAt ? step.endedAt - step.startedAt : null;
          return (
            <div key={step.id} className="flex items-start gap-2.5">
              {step.status === 'running' && (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-yellow-100 border-t-yellow-600 animate-spin mt-0.5 shrink-0" />
              )}
              {step.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />}
              {step.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />}
              {step.status === 'pending' && <Circle className="w-3.5 h-3.5 text-yellow-300 mt-0.5 shrink-0" />}
              <div className="flex items-baseline gap-2 flex-wrap flex-1">
                <span className={
                  step.status === 'done' ? 'text-green-700' :
                  step.status === 'error' ? 'text-red-400' :
                  'text-yellow-600'
                }>{step.text}</span>
                {step.detail && <span className={step.status === 'done' ? 'text-green-600 text-xs' : 'text-yellow-500 text-xs'}>{step.detail}</span>}
              </div>
              {tookMs !== null && (
                <span className="text-green-500 text-xs shrink-0 tabular-nums ml-2">{formatDone(tookMs)}</span>
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

// ── Discovery Steps ───────────────────────────────────────────────
const STEPS = [
  { label: 'Discover', desc: 'Search & AI match' },
  { label: 'Review', desc: 'Select products' },
  { label: 'Track', desc: 'Save & get prices' },
];

function phaseToStep(phase: Phase): number {
  if (phase === 'search' || phase === 'processing') return 0;
  if (phase === 'review') return 1;
  return 2;
}

function DiscoverySteps({ phase }: { phase: Phase }) {
  const active = phaseToStep(phase);
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((step, i) => (
        <div key={step.label} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${
              i < active
                ? 'bg-black border-black text-white'
                : i === active
                  ? 'bg-black border-black text-white ring-4 ring-black/10'
                  : 'bg-white border-gray-200 text-gray-400'
            }`}>
              {i < active ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <div className="hidden sm:block">
              <p className={`text-xs font-semibold leading-tight ${i <= active ? 'text-foreground' : 'text-gray-400'}`}>{step.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{step.desc}</p>
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-3 transition-all ${i < active ? 'bg-black' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export function Discovering() {
  const {
    companies, phase, query, setQuery, selectedIds,
    logSteps, discoverStartedAt, results, prices, selected,
    toggle, toggleSelect, setSelectedKeys, setStoreIds, handleDiscover, handleSaveSelected, handleNewSearch,
  } = useDiscovery();

  // Local UI state only
  const [showDropdown, setShowDropdown] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <Compass className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">Market Discovery</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            AI-powered product discovery — finds, matches, saves, and prices everything in one click
          </p>

          {/* Steps */}
          <DiscoverySteps phase={phase} />

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
                      <span>Track {selected.size} Product{selected.size !== 1 ? 's' : ''}</span>
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
                      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{companies.length} store{companies.length !== 1 ? 's' : ''}</span>
                        <button
                          type="button"
                          onClick={() => selectedIds.length === companies.length ? setStoreIds([]) : setStoreIds(companies.map(c => c.id))}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {selectedIds.length === companies.length ? 'Deselect all' : 'Select all'}
                        </button>
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
                      if (allChecked) {
                        setSelectedKeys([...selected].filter(k => !selectableKeys.includes(k)));
                      } else {
                        setSelectedKeys([...new Set([...selected, ...selectableKeys])]);
                      }
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
                      {/* Image */}
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
                        {m.match && !isSizeMismatch ? (
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
