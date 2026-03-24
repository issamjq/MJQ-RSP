import { useEffect, useState, useCallback } from "react";
import { Building2, Plus, RefreshCw, Pencil, Trash2, Play, Check, X } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../ui/dialog";
import { toast } from "sonner@2.0.3";
import { companiesApi, scraperApi, type Company } from "../../lib/monitorApi";

// ── Form Modal ─────────────────────────────────────────────────────

interface CompanyFormProps {
  open: boolean;
  initial?: Partial<Company>;
  onClose: () => void;
  onSaved: () => void;
}

function CompanyForm({ open, initial, onClose, onSaved }: CompanyFormProps) {
  const isEdit = Boolean(initial?.id);
  const [name, setName]       = useState(initial?.name       ?? "");
  const [slug, setSlug]       = useState(initial?.slug       ?? "");
  const [baseUrl, setBaseUrl] = useState(initial?.base_url   ?? "");
  const [active, setActive]   = useState(initial?.is_active  ?? true);
  const [saving, setSaving]   = useState(false);

  // Reset when modal reopens
  useEffect(() => {
    if (open) {
      setName(initial?.name      ?? "");
      setSlug(initial?.slug      ?? "");
      setBaseUrl(initial?.base_url ?? "");
      setActive(initial?.is_active ?? true);
    }
  }, [open, initial]);

  // Auto-slug from name
  const handleNameChange = (v: string) => {
    setName(v);
    if (!isEdit) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && initial?.id) {
        await companiesApi.update(initial.id, { name, slug, base_url: baseUrl || undefined, is_active: active });
        toast.success("Company updated");
      } else {
        await companiesApi.create({ name, slug, base_url: baseUrl || undefined });
        toast.success("Company created");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl px-3 py-2 text-sm dark:bg-[#1A1A2E] bg-muted/50 border dark:border-white/10 border-border dark:text-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 dark:focus:ring-primary/50 focus:ring-primary/30";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="dark:bg-[#12121C] bg-white border dark:border-primary/20 border-primary/15 rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="dark:text-white text-foreground">
            {isEdit ? "Edit Company" : "Add Company"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">Name *</label>
            <input className={inputCls} placeholder="Amazon AE" value={name} onChange={e => handleNameChange(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">Slug *</label>
            <input className={inputCls} placeholder="amazon-ae" value={slug} onChange={e => setSlug(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium dark:text-muted-foreground text-muted-foreground">Base URL</label>
            <input className={inputCls} placeholder="https://www.amazon.ae" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" />
              <span className="text-sm dark:text-white text-foreground">Active</span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90 text-white">
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading]     = useState(true);
  const [formOpen, setFormOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<Company | undefined>();
  const [scraping, setScraping]   = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await companiesApi.list(true);
      setCompanies(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      toast.error(msg);
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
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error(msg);
    }
  };

  const handleScrapeCompany = async (company: Company) => {
    setScraping(company.id);
    try {
      await scraperApi.runCompany(company.id);
      toast.success(`Scrape started for ${company.name} — check Sync Runs`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start scrape";
      toast.error(msg);
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
          <h1 className="text-2xl font-bold tracking-tight dark:text-white text-foreground">Companies</h1>
          <p className="mt-1 text-sm dark:text-muted-foreground text-muted-foreground">
            {companies.length} marketplace{companies.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="rounded-xl gap-2 dark:border-primary/30 border-primary/20">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openAdd}
            className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
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
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Company</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden md:table-cell">Slug</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground hidden lg:table-cell">Base URL</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider dark:text-muted-foreground text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5 divide-border">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center dark:text-muted-foreground text-muted-foreground">Loading…</td></tr>
              ) : companies.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center dark:text-muted-foreground text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No companies yet. Add one to start.
                </td></tr>
              ) : (
                companies.map(c => (
                  <tr key={c.id} className="dark:hover:bg-white/[0.02] hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium dark:text-white text-foreground">{c.name}</div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="dark:text-muted-foreground text-muted-foreground font-mono text-xs">{c.slug}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {c.base_url ? (
                        <a href={c.base_url} target="_blank" rel="noreferrer"
                          className="dark:text-primary text-primary hover:underline text-xs truncate max-w-[200px] block">
                          {c.base_url}
                        </a>
                      ) : (
                        <span className="dark:text-muted-foreground text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs dark:text-emerald-400 text-emerald-600">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs dark:text-muted-foreground text-muted-foreground">
                          <X className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="icon" title="Scrape this company"
                          disabled={scraping === c.id}
                          onClick={() => handleScrapeCompany(c)}
                          className="h-8 w-8 rounded-lg dark:text-muted-foreground text-muted-foreground dark:hover:text-primary hover:text-primary">
                          <Play className={`h-3.5 w-3.5 ${scraping === c.id ? "animate-pulse" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit"
                          onClick={() => openEdit(c)}
                          className="h-8 w-8 rounded-lg dark:text-muted-foreground text-muted-foreground dark:hover:text-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete"
                          onClick={() => handleDelete(c)}
                          className="h-8 w-8 rounded-lg dark:text-muted-foreground text-muted-foreground dark:hover:text-red-400 hover:text-red-500">
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
