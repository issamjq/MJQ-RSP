import { AppSidebar } from '../components/app-sidebar';
import { Skeleton } from '../components/ui/skeleton';
import { Building2, RefreshCw, Plus, Edit, Trash2, CheckCircle2, X, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { companiesApi } from '../../lib/monitorApi';
import type { Company } from '../../lib/monitorApi';
import { toast } from 'sonner';

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', base_url: '', logo_url: '', is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await companiesApi.list(true);
      setCompanies(res.data);
    } catch {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', slug: '', base_url: '', logo_url: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (c: Company) => {
    setEditTarget(c);
    setForm({ name: c.name, slug: c.slug, base_url: c.base_url || '', logo_url: c.logo_url || '', is_active: c.is_active });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) { toast.error('Name and slug are required'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await companiesApi.update(editTarget.id, { name: form.name, slug: form.slug, base_url: form.base_url || undefined, logo_url: form.logo_url || undefined, is_active: form.is_active });
        toast.success('Company updated');
      } else {
        await companiesApi.create({ name: form.name, slug: form.slug, base_url: form.base_url || undefined, logo_url: form.logo_url || undefined });
        toast.success('Company added');
      }
      setShowModal(false);
      load();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Company) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    try {
      await companiesApi.delete(c.id);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Stores</h1>
              <p className="text-sm text-muted-foreground mt-1">{companies.length} marketplaces configured</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="p-2 text-gray-500 hover:bg-white rounded-lg transition-colors border border-gray-200">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                Add Company
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
                  <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Company</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Slug</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Base URL</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {companies.map((company) => (
                      <tr key={company.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {company.logo_url ? (
                              <img src={company.logo_url} alt={company.name} className="w-8 h-8 rounded-lg object-contain bg-gray-100 p-1 border border-gray-100 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center"><Building2 className="w-4 h-4 text-gray-400" /></div>
                            )}
                            <span className="text-sm font-medium">{company.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell"><span className="text-sm text-muted-foreground font-mono">{company.slug}</span></td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          {company.base_url ? (
                            <a href={company.base_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">{company.base_url}</a>
                          ) : <span className="text-sm text-muted-foreground">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${company.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {company.is_active && <CheckCircle2 className="w-3 h-3" />}
                            {company.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(company)} className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Edit">
                              <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                            <button onClick={() => handleDelete(company)} className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 z-50 bg-white/10 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{editTarget ? 'Edit Company' : 'Add Company'}</h2>
                <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter company name" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                  <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="company-slug" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                  <input type="url" value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))} placeholder="https://www.example.com" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                  <div className="flex items-center gap-3">
                    {form.logo_url && (
                      <img src={form.logo_url} alt="logo preview" className="w-10 h-10 rounded-lg object-contain bg-gray-100 border border-gray-200 p-1 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <input type="url" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://example.com/logo.png" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editTarget ? 'Save Changes' : 'Add Company'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
