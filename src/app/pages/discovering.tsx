import { AppSidebar } from '../components/app-sidebar';
import { Compass, Sparkles, Search, ChevronDown, Check, ArrowRight, Loader2, ExternalLink, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { companiesApi, discoveryApi } from '../../lib/monitorApi';
import type { Company, DiscoveryMatch } from '../../lib/monitorApi';
import { toast } from 'sonner';

export function Discovering() {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Array<{ company: Company; matches: DiscoveryMatch[] }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    companiesApi.list().then(res => setCompanies(res.data)).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showCompanyDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCompanyDropdown]);

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const toggleCompany = (id: number) => {
    setSelectedCompanyIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const removeCompany = (id: number) => {
    setSelectedCompanyIds(prev => prev.filter(x => x !== id));
  };

  const selectedCompanies = companies.filter(c => selectedCompanyIds.includes(c.id));

  const handleDiscover = async () => {
    if (!query.trim()) { toast.error('Enter a search query'); return; }
    if (selectedCompanyIds.length === 0) { toast.error('Select at least one company'); return; }
    setIsSearching(true);
    setResults([]);
    try {
      const allResults = await Promise.all(
        selectedCompanyIds.map(async (companyId) => {
          const company = companies.find(c => c.id === companyId)!;
          try {
            const res = await discoveryApi.search(companyId, query);
            return { company, matches: res.data.results };
          } catch {
            return { company, matches: [] };
          }
        })
      );
      setResults(allResults.filter(r => r.matches.length > 0));
      setStep(2);
    } catch {
      toast.error('Discovery failed');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const handleConfirm = async () => {
    const toConfirm: Array<{ companyId: number; product_id: number; url: string; image_url?: string | null }> = [];
    results.forEach(({ company, matches }) => {
      matches.forEach((m, i) => {
        const key = `${company.id}-${i}`;
        if (selected.has(key) && m.match && !m.already_tracked) {
          toConfirm.push({ companyId: company.id, product_id: m.match.product.id, url: m.found.url, image_url: m.found.imageUrl });
        }
      });
    });
    if (toConfirm.length === 0) { toast.error('No new mappings selected'); return; }
    setConfirming(true);
    try {
      const grouped = toConfirm.reduce((acc, { companyId, ...rest }) => {
        if (!acc[companyId]) acc[companyId] = [];
        acc[companyId].push(rest);
        return acc;
      }, {} as Record<number, Array<{ product_id: number; url: string; image_url?: string | null }>>);
      let totalAdded = 0;
      for (const [companyId, mappings] of Object.entries(grouped)) {
        const res = await discoveryApi.confirm(Number(companyId), mappings);
        totalAdded += res.data.added;
      }
      toast.success(`Added ${totalAdded} URL mappings`);
      setStep(3);
    } catch {
      toast.error('Failed to save mappings');
    } finally {
      setConfirming(false);
    }
  };

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
  const newMatches = results.reduce((sum, r) => sum + r.matches.filter(m => !m.already_tracked).length, 0);

  const steps = [
    { number: 1, title: 'Discover', description: 'Search products' },
    { number: 2, title: 'Product URLs', description: 'Review mappings' },
    { number: 3, title: 'Done', description: 'URLs saved' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <Compass className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">Discovering</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8">AI-powered product URL discovery across marketplaces</p>

          {/* Steps */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto">
            {steps.map((s, i) => (
              <div key={s.number} className="flex items-center gap-2 shrink-0">
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${step === s.number ? 'bg-black text-white' : step > s.number ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-white border border-gray-200 text-muted-foreground'}`}>
                  {step > s.number ? <Check className="w-4 h-4" /> : <span className="text-sm font-semibold">{s.number}</span>}
                  <div>
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="text-xs opacity-70">{s.description}</div>
                  </div>
                </div>
                {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />}
              </div>
            ))}
          </div>

          {/* Step 1: Search */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-semibold mb-1">Search for products</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter a product name and select marketplaces to search</p>

              <div className="space-y-4">
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

                {/* Company Selector */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-left flex items-center justify-between bg-gray-50 hover:bg-white transition-all text-sm"
                  >
                    <span className={selectedCompanies.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                      {selectedCompanies.length > 0 ? `${selectedCompanies.length} company selected` : 'Select marketplaces…'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {selectedCompanies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCompanies.map(c => (
                        <span key={c.id} className="flex items-center gap-1 px-2.5 py-1 bg-black text-white text-xs rounded-lg">
                          {c.name}
                          <button onClick={() => removeCompany(c.id)} className="ml-1 hover:text-gray-300">×</button>
                        </span>
                      ))}
                    </div>
                  )}

                  {showCompanyDropdown && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-gray-100">
                        <input
                          type="text"
                          placeholder="Search companies…"
                          value={companySearch}
                          onChange={e => setCompanySearch(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCompanies.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { toggleCompany(c.id); setCompanySearch(''); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm"
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedCompanyIds.includes(c.id) ? 'bg-black border-black' : 'border-gray-300'}`}>
                              {selectedCompanyIds.includes(c.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDiscover}
                  disabled={isSearching || !query.trim() || selectedCompanyIds.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isSearching ? 'Discovering…' : 'Discover Products'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Review discovered URLs</h2>
                  <p className="text-sm text-muted-foreground">{totalMatches} found · {newMatches} new · select to save</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep(1)} className="px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">← Back</button>
                  <button
                    onClick={handleConfirm}
                    disabled={confirming || selected.size === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Save Selected ({selected.size})
                  </button>
                </div>
              </div>

              {results.map(({ company, matches }) => (
                <div key={company.id} className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <span className="font-semibold text-sm">{company.name}</span>
                    <span className="text-xs text-muted-foreground">{matches.length} results</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {matches.map((m, i) => {
                      const key = `${company.id}-${i}`;
                      const isTracked = m.already_tracked;
                      return (
                        <div key={key} className={`px-5 py-3 flex items-start gap-3 ${isTracked ? 'opacity-50' : ''}`}>
                          {!isTracked && (
                            <input
                              type="checkbox"
                              checked={selected.has(key)}
                              onChange={() => toggleSelect(key)}
                              className="mt-1 rounded shrink-0"
                            />
                          )}
                          {isTracked && <div className="w-4 shrink-0 mt-1"><Check className="w-4 h-4 text-green-500" /></div>}
                          {m.found.imageUrl && (
                            <img src={m.found.imageUrl} alt={m.found.name} className="w-12 h-12 object-cover rounded-lg shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.found.name}</p>
                            {m.match && (
                              <p className="text-xs text-muted-foreground">Matched: {m.match.product.internal_name} ({Math.round(m.match.confidence * 100)}%)</p>
                            )}
                            <a href={m.found.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                              View product <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          {isTracked && <span className="text-xs text-green-600 shrink-0">Already tracked</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {results.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                  <p className="text-sm text-muted-foreground">No results found for your query</p>
                  <button onClick={() => setStep(1)} className="mt-4 px-4 py-2 text-sm bg-black text-white rounded-lg">Try again</button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">URLs saved successfully!</h2>
              <p className="text-sm text-muted-foreground mb-6">The discovered product URLs have been added to your monitoring list.</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => { setStep(1); setQuery(''); setSelectedCompanyIds([]); setResults([]); setSelected(new Set()); }} className="px-5 py-2.5 text-sm border border-gray-200 hover:bg-gray-50 rounded-lg">
                  Discover More
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
