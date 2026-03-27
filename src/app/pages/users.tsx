import { AppSidebar } from '../components/app-sidebar';
import { Users as UsersIcon, Plus, Edit, Trash2, X, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { usersApi, ROLES } from '../../lib/monitorApi';
import type { AllowedUser } from '../../lib/monitorApi';
import { useUser } from '../contexts/user-context';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

const ROLE_OPTIONS = Object.entries(ROLES).sort(([a], [b]) => a.localeCompare(b));

export function UsersPage() {
  const { isManagement } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AllowedUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: '008', is_active: true });

  useEffect(() => {
    if (!isManagement) { navigate('/overview'); }
  }, [isManagement, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      setUsers(res.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ email: '', name: '', role: '008', is_active: true });
    setShowModal(true);
  };

  const openEdit = (u: AllowedUser) => {
    setEditTarget(u);
    setForm({ email: u.email, name: u.name || '', role: u.role, is_active: u.is_active });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await usersApi.update(editTarget.id, { name: form.name || undefined, role: form.role, is_active: form.is_active });
        toast.success('User updated');
      } else {
        await usersApi.create({ email: form.email.trim(), name: form.name || undefined, role: form.role, is_active: form.is_active });
        toast.success('User added');
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: AllowedUser) => {
    if (!confirm(`Remove access for ${u.email}?`)) return;
    try {
      await usersApi.delete(u.id);
      toast.success('User removed');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleToggle = async (u: AllowedUser) => {
    try {
      await usersApi.update(u.id, { is_active: !u.is_active });
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Access Control</h1>
              <p className="text-sm text-muted-foreground mt-1">{users.length} user{users.length !== 1 ? 's' : ''} with access</p>
            </div>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors shadow-sm">
              <Plus className="w-4 h-4" />Add User
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="divide-y divide-gray-50">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <div className="w-9 h-9 bg-gray-100 rounded-full animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
                      <div className="h-3 bg-gray-100 rounded w-32 animate-pulse" />
                    </div>
                    <div className="h-6 bg-gray-100 rounded-full w-20 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-muted-foreground">No users yet. Add the first one.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-gray-600">{(u.name || u.email)[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 shrink-0">
                      {u.role} · {ROLES[u.role] ?? u.role}
                    </span>
                    <button onClick={() => handleToggle(u)} title={u.is_active ? 'Disable' : 'Enable'} className="shrink-0">
                      {u.is_active
                        ? <CheckCircle2 className="w-5 h-5 text-green-500 hover:text-green-700 transition-colors" />
                        : <XCircle className="w-5 h-5 text-gray-300 hover:text-gray-500 transition-colors" />}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-gray-100 rounded transition-colors"><Edit className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={() => handleDelete(u)} className="p-1.5 hover:bg-gray-100 rounded transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-4 px-1">
            Only active users can sign in. Disable to revoke access without deleting.
          </p>
        </div>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 z-50 bg-white/10 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{editTarget ? 'Edit User' : 'Add User'}</h2>
                <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email" value={form.email} disabled={!!editTarget}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  {editTarget && <p className="text-xs text-muted-foreground mt-1">Email cannot be changed after creation.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  >
                    {ROLE_OPTIONS.map(([code, label]) => (
                      <option key={code} value={code}>{code} — {label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={form.is_active ? 'active' : 'inactive'}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editTarget ? 'Save Changes' : 'Add User'}
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
