import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { companiesApi, discoveryApi } from '../../lib/monitorApi';
import type { Company, DiscoveryMatch, PriceSnapshot } from '../../lib/monitorApi';
import { toast } from 'sonner';

// ── Shared types ──────────────────────────────────────────────────
export interface LogStep {
  id: string;
  text: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
  startedAt?: number;
  endedAt?: number;
}

export type Phase = 'search' | 'processing' | 'review' | 'results';

export interface DiscoveryGroup {
  company: Company;
  matches: DiscoveryMatch[];
}

// ── Pure helpers ─────────────────────────────────────────────────
function extractSize(name: string): string | null {
  const m = name.match(/\b(\d+(?:\.\d+)?)\s*(ml|g|mg|kg|oz|l)\b/i);
  return m ? `${m[1]}${m[2].toLowerCase()}` : null;
}

export function sizeMismatch(foundName: string, internalName: string): boolean {
  const a = extractSize(foundName);
  const b = extractSize(internalName);
  if (!a || !b) return false;
  return a !== b;
}

// ── Context value ─────────────────────────────────────────────────
interface DiscoveryContextValue {
  companies: Company[];
  phase: Phase;
  query: string;
  setQuery: (q: string) => void;
  selectedIds: number[];
  logSteps: LogStep[];
  discoverStartedAt: number;
  results: DiscoveryGroup[];
  prices: Record<string, PriceSnapshot | null | 'loading'>;
  selected: Set<string>;
  toggle: (id: number) => void;
  setStoreIds: (ids: number[]) => void;
  toggleSelect: (key: string) => void;
  setSelectedKeys: (keys: string[]) => void;
  handleDiscover: () => Promise<void>;
  handleSaveSelected: () => Promise<void>;
  handleNewSearch: () => void;
}

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────
export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [phase, setPhase] = useState<Phase>('search');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [logSteps, setLogSteps] = useState<LogStep[]>([]);
  const [discoverStartedAt, setDiscoverStartedAt] = useState<number>(0);
  const [results, setResults] = useState<DiscoveryGroup[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceSnapshot | null | 'loading'>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    companiesApi.list().then(r => setCompanies(r.data)).catch(() => {});
  }, []);

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

  const toggle = useCallback((id: number) =>
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]),
  []);

  const setStoreIds = useCallback((ids: number[]) => setSelectedIds(ids), []);

  const toggleSelect = useCallback((key: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }),
  []);

  const setSelectedKeys = useCallback((keys: string[]) =>
    setSelected(new Set(keys)),
  []);

  const handleDiscover = useCallback(async () => {
    if (!query.trim()) { toast.error('Enter a product name'); return; }
    if (selectedIds.length === 0) { toast.error('Select at least one marketplace'); return; }

    setPhase('processing');
    setLogSteps([]);
    setResults([]);
    setPrices({});
    setDiscoverStartedAt(Date.now());

    const targetCompanies = companies.filter(c => selectedIds.includes(c.id));

    addLog('init', `Starting discovery for "${query}"`, 'running');
    targetCompanies.forEach(c => addLog(`scan-${c.id}`, `Scanning ${c.name}…`, 'running'));

    const allGroups: DiscoveryGroup[] = [];

    await Promise.all(
      targetCompanies.map(async company => {
        const t1 = setTimeout(() =>
          updateLog(`scan-${company.id}`, 'running', `Scanning ${company.name}…`, 'still working…'),
          30000
        );
        const t2 = setTimeout(() =>
          updateLog(`scan-${company.id}`, 'running', `Scanning ${company.name}…`, 'taking longer than usual, be patient…'),
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
    updateLog('init', 'done', 'Search complete',
      `${totalFound} products found across ${validGroups.length} marketplace${validGroups.length !== 1 ? 's' : ''}`
    );

    if (validGroups.length === 0) {
      addLog('done', 'No products found. Try a different query.', 'error');
      setPhase('search');
      toast.info('No products found.');
      return;
    }

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
      `${newCount} new · ${trackedCount} tracked${skippedCount > 0 ? ` · ${skippedCount} skipped` : ''}`
    );

    if (newCount === 0) {
      addLog('alldone', 'All found products are already tracked!', 'done');
      setResults(validGroups);
      setPhase('results');
      return;
    }

    addLog('review', `Ready to review — ${newCount} new product${newCount !== 1 ? 's' : ''} to add`, 'done');

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
  }, [query, selectedIds, companies, addLog, updateLog]);

  const handleSaveSelected = useCallback(async () => {
    const toSave: Array<{
      companyId: number; product_id: number; url: string;
      image_url?: string | null; price?: number | null;
      original_price?: number | null; currency?: string;
      availability?: string; key: string;
    }> = [];

    results.forEach(({ company, matches }) => {
      matches.forEach((m, i) => {
        const key = `${company.id}-${i}`;
        if (selected.has(key) && m.match && !m.already_tracked) {
          toSave.push({
            companyId: company.id, product_id: m.match.product.id,
            url: m.found.url, image_url: m.found.imageUrl,
            price: m.found.price, original_price: m.found.original_price,
            currency: m.found.currency, availability: m.found.availability, key,
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

    const priceMap: Record<string, PriceSnapshot | null> = {};
    toSave.forEach(x => {
      priceMap[x.key] = x.price != null ? {
        id: 0, product_id: x.product_id, company_id: x.companyId,
        product_company_url_id: null, title_found: null,
        price: x.price, original_price: x.original_price ?? null,
        currency: x.currency ?? 'AED', availability: x.availability ?? 'unknown',
        raw_price_text: null, raw_availability_text: null,
        scrape_status: 'success', error_message: null,
        checked_at: new Date().toISOString(), created_at: new Date().toISOString(),
        internal_name: '', company_name: '',
        image_url: x.image_url ?? null, product_url: x.url,
      } : null;
    });
    setPrices(priceMap);
    addLog('alldone', `Done! ${savedCount} product${savedCount !== 1 ? 's' : ''} added to monitoring.`, 'done');
  }, [results, selected, addLog, updateLog]);

  const handleNewSearch = useCallback(() => {
    setPhase('search');
    setResults([]);
    setPrices({});
    setLogSteps([]);
    setSelected(new Set());
  }, []);

  return (
    <DiscoveryContext.Provider value={{
      companies, phase, query, setQuery, selectedIds,
      logSteps, discoverStartedAt, results, prices, selected,
      toggle, setStoreIds, toggleSelect, setSelectedKeys, handleDiscover, handleSaveSelected, handleNewSearch,
    }}>
      {children}
    </DiscoveryContext.Provider>
  );
}

export function useDiscovery() {
  const ctx = useContext(DiscoveryContext);
  if (!ctx) throw new Error('useDiscovery must be inside DiscoveryProvider');
  return ctx;
}
