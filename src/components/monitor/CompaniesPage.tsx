import { useEffect, useState, useCallback } from "react";
import { Building2, Plus, RefreshCw, Pencil, Trash2, Play, Check, X, Zap, Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner@2.0.3";
import { companiesApi, scraperApi, discoveryApi, type Company, type ProbeResult } from "../../lib/monitorApi";

// ── Form Modal (slide-in from right) ───────────────────────────────

interface CompanyFormProps {
  open: boolean;
  initial?: Partial<Company>;
  onClose: () => void;
  onSaved: () => void;
}

function CompanyForm({ open, initial, onClose, onSaved }: CompanyFormProps) {
  const isEdit = Boolean(initial?.id);
  const [name,    setName]    = useState(initial?.name     ?? "");
  const [slug,    setSlug]    = useState(initial?.slug     ?? "");
  const [baseUrl, setBaseUrl] = useState(initial?.base_url ?? "");
  const [active,  setActive]  = useState(initial?.is_active ?? true);
  const [saving,  setSaving]  = useState(false);

  const [probing,      setProbing]      = useState(false);
  const [probeResult,  setProbeResult]  = useState<ProbeResult | null>(null);
  const [probeQuery,   setProbeQuery]   = useState("shampoo");

  useEffect(() => {
    if (open) {
      setName(initial?.name      ?? "");
      setSlug(initial?.slug      ?? "");
      setBaseUrl(initial?.base_url ?? "");
      setActive(initial?.is_active ?? true);
      setProbeResult(null);
    }
  }, [open, initial]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!isEdit) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const handleProbe = async () => {
    if (!baseUrl.trim()) { toast.error("Enter a Base URL first"); return; }
    setProbing(true);
    setProbeResult(null);
    try {
      const res = await discoveryApi.probe(baseUrl.trim(), probeQuery.trim() || "shampoo");
      setProbeResult(res.data);
    } catch {
      setProbeResult({ success: false, message: "Probe failed — check the URL and try again." });
    } finally {
      setProbing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) { toast.error("Name and slug are required"); return; }
    setSaving(true);
    try {
      let companyId: number;
      if (isEdit && initial?.id) {
        await companiesApi.update(initial.id, { name, slug, base_url: baseUrl || undefined, is_active: active });
        companyId = initial.id;
        toast.success("Company updated");
      } else {
        const res = await companiesApi.create({ name, slug, base_url: baseUrl || undefined });
        companyId = res.data.id;
        toast.success("Company created");
      }
      if (probeResult?.success && probeResult.search_url_template) {
        await companiesApi.upsertConfig(companyId, {
          page_options: { search_url_template: probeResult.search_url_template },
          notes: `Auto-detected: ${probeResult.products_found} products found via ${probeResult.pattern}`,
        }).catch(() => {});
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/5";

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-white/10 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Slide-in panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? "Edit Company" : "Add Company"}
          </h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <input className={inputCls} placeholder="Life Pharmacy" value={name} onChange={e => handleNameChange(e.target.value)} />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Slug *</label>
            <input className={inputCls} placeholder="life-pharmacy" value={slug} onChange={e => setSlug(e.target.value)} />
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Website URL</label>
            <input
              className={inputCls}
              placeholder="https://www.example.com"
              value={baseUrl}
              onChange={e => { setBaseUrl(e.target.value); setProbeResult(null); }}
            />
          </div>

          {/* Auto-Detect Section */}
          {!isEdit && (
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-gray-700 shrink-0" />
                <span className="text-xs font-semibold text-foreground">Auto-Detect Search</span>
                <span className="text-xs text-muted-foreground">— finds how this site's search works</span>
              </div>

              <div className="flex gap-2">
                <input
                  className={inputCls + " flex-1"}
                  placeholder="Test word (e.g. shampoo)"
                  value={probeQuery}
                  onChange={e => setProbeQuery(e.target.value)}
                  disabled={probing}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleProbe}
                  disabled={probing || !baseUrl.trim()}
                  className="rounded-lg shrink-0 gap-1.5 border-gray-200"
                >
                  {probing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  {probing ? "Testing…" : "Test"}
                </Button>
              </div>

              {probeResult && (
                <div className={`rounded-lg p-3 text-xs space-y-1.5 border ${
                  probeResult.success
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                }`}>
                  {probeResult.success ? (
                    <>
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Works! Found {probeResult.products_found} products
                      </div>
                      <div className="text-emerald-800 font-mono truncate">
                        {probeResult.pattern}
                      </div>
                      {probeResult.sample && probeResult.sample.length > 0 && (
                        <div className="text-emerald-700/70 space-y-0.5 pt-1">
                          {probeResult.sample.slice(0, 3).map((p, i) => (
                            <div key={i} className="truncate">• {p.name}</div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-start gap-1.5 text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{probeResult.message || "Could not detect search URL. You can still add it and configure manually."}</span>
                    </div>
                  )}
                </div>
              )}

              {!probeResult && !probing && (
                <p className="text-[11px] text-muted-foreground/70">
                  Enter the website URL above, then click Test to automatically detect how to search it.
                  Works for most sites — no code needed.
                </p>
              )}
            </div>
          )}

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" />
              <span className="text-sm text-foreground">Active</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-lg bg-black text-white hover:bg-gray-800">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export function CompaniesPage() {
  const [companies,   setCompanies]   = useState<Company[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [formOpen,    setFormOpen]    = useState(false);
  const [editTarget,  setEditTarget]  = useState<Company | undefined>();
  const [scraping,    setScraping]    = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await companiesApi.list(true);
      setCompanies(res.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (company: Company) => {
    if (!confirm(`Delete "${company.name}"? This removes all its URL mappings and configs.`)) return;
    try {
      await companiesApi.delete(company.id);
      toast.success("Company deleted");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleScrapeCompany = async (company: Company) => {
    setScraping(company.id);
    try {
      await scraperApi.runCompany(company.id);
      toast.success(`Scrape started for ${company.name} — check Sync Runs`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start scrape");
    } finally {
      setScraping(null);
    }
  };

  const openAdd  = () => { setEditTarget(undefined); setFormOpen(true); };
  const openEdit = (c: Company) => { setEditTarget(c); setFormOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {companies.length} marketplace{companies.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="rounded-lg gap-2 border-gray-200 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openAdd}
            className="rounded-lg gap-2 bg-black text-white hover:bg-gray-800">
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
      </div>

      {/* How it works info box */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-2">How adding a new website works</p>
        <p>1. Click <span className="text-foreground font-medium">Add Company</span> → enter name + website URL → click <span className="text-foreground font-medium">Test</span> to auto-detect how the site's search works.</p>
        <p>2. Once added, go to <span className="text-foreground font-medium">Product URLs → Auto-Discover</span>, pick the company, type any product/brand name, and Claude AI finds + matches the products for you.</p>
        <p>3. No code needed for most websites. Special sites (apps, login-required) may need manual setup.</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Company</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Slug</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Base URL</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : companies.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No companies yet. Add one to start.
                </td></tr>
              ) : (
                companies.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{c.name}</div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-muted-foreground font-mono text-xs">{c.slug}</span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {c.base_url ? (
                        <a href={c.base_url} target="_blank" rel="noreferrer"
                          className="text-gray-700 hover:underline text-xs truncate max-w-[200px] block">
                          {c.base_url}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <X className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="icon" title="Scrape this company"
                          disabled={scraping === c.id}
                          onClick={() => handleScrapeCompany(c)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-gray-900 hover:bg-gray-100">
                          <Play className={`h-3.5 w-3.5 ${scraping === c.id ? "animate-pulse" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit"
                          onClick={() => openEdit(c)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-gray-900 hover:bg-gray-100">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete"
                          onClick={() => handleDelete(c)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50">
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
      </div>

      <CompanyForm
        open={formOpen}
        initial={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
