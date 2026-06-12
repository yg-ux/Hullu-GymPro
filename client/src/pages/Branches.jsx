import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  X,
  Trash2,
  Edit,
  Building2,
  Phone,
  MapPin,
  User,
  Crown,
  Users,
  UserCheck,
  RefreshCw,
  ChevronDown,
  Star,
  CheckCircle,
  BarChart3,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import clsx from 'clsx';

// ── Branch Card ───────────────────────────────────────────────────────────────
function BranchCard({ branch, onEdit, onDelete, onSetMain, isMain }) {
  return (
    <div
      className={clsx(
        'bg-dark-300 rounded-2xl border p-6 transition-all flex flex-col gap-4 relative overflow-hidden',
        isMain
          ? 'border-amber-500/40 shadow-lg shadow-amber-500/5'
          : 'border-gray-800/50 hover:border-gym-500/30 hover:shadow-lg hover:shadow-gym-500/5'
      )}
    >
      {/* Subtle gradient glow for main branch */}
      {isMain && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 relative">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={clsx(
            'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg',
            isMain ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/30' : 'bg-gradient-to-br from-gym-500 to-gym-700 shadow-gym-500/30'
          )}>
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white text-lg leading-tight">{branch.name}</h3>
              {isMain && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold">
                  <Crown className="w-3 h-3" />
                  Main Branch
                </span>
              )}
              {!branch.is_active && (
                <span className="inline-flex items-center px-2.5 py-0.5 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg text-xs font-medium">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2.5 relative">
        {branch.address && (
          <div className="flex items-start gap-2.5 text-sm text-gray-400">
            <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
            <span className="leading-relaxed">{branch.address}</span>
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-2.5 text-sm text-gray-400">
            <Phone className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span>{branch.phone}</span>
          </div>
        )}
        {branch.manager_name && (
          <div className="flex items-center gap-2.5 text-sm text-gray-400">
            <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span>{branch.manager_name}</span>
          </div>
        )}
      </div>

      {/* Member counts */}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-800/50 relative">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-400 rounded-xl">
            <Users className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-sm font-semibold text-white">{branch.customer_count ?? 0}</span>
            <span className="text-xs text-gray-500">members</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">{branch.active_count ?? 0}</span>
            <span className="text-xs text-emerald-500">active</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 relative">
        <button
          onClick={() => onEdit(branch)}
          className="flex items-center gap-1.5 px-3 py-2 bg-dark-400 hover:bg-gym-500/20 text-gray-400 hover:text-gym-400 rounded-xl text-sm font-medium transition-all flex-1 justify-center"
        >
          <Edit className="w-3.5 h-3.5" />
          Edit
        </button>

        {!isMain && (
          <button
            onClick={() => onSetMain(branch)}
            className="flex items-center gap-1.5 px-3 py-2 bg-dark-400 hover:bg-amber-500/10 text-gray-400 hover:text-amber-400 rounded-xl text-sm font-medium transition-all flex-1 justify-center"
            title="Set as main branch"
          >
            <Crown className="w-3.5 h-3.5" />
            Set Main
          </button>
        )}

        <button
          onClick={() => !isMain && onDelete(branch)}
          disabled={isMain}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
            isMain
              ? 'opacity-30 cursor-not-allowed bg-dark-400 text-gray-600'
              : 'bg-dark-400 hover:bg-red-500/10 text-gray-400 hover:text-red-400'
          )}
          title={isMain ? 'Cannot delete the main branch' : 'Delete branch'}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {isMain ? '' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

// ── Slide-in Form ─────────────────────────────────────────────────────────────
function BranchForm({ form, onChange, onSubmit, onClose, saving }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-dark-200 border-l border-gray-800/60 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gym-400" />
            {form.id ? 'Edit Branch' : 'Add Branch'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Branch Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => onChange('name', e.target.value)}
              placeholder="e.g. Downtown Branch"
              className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Address</label>
            <textarea
              value={form.address}
              onChange={e => onChange('address', e.target.value)}
              placeholder="Full address..."
              rows={2}
              className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors resize-none"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => onChange('phone', e.target.value)}
              placeholder="+251..."
              className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
            />
          </div>

          {/* Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Manager Name <span className="text-gray-600">(optional)</span></label>
            <input
              type="text"
              value={form.manager_name}
              onChange={e => onChange('manager_name', e.target.value)}
              placeholder="Branch manager's name"
              className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between bg-dark-300 rounded-xl px-4 py-3 border border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-200">Active</p>
              <p className="text-xs text-gray-500">Branch is open and accepting members</p>
            </div>
            <button
              type="button"
              onClick={() => onChange('is_active', !form.is_active)}
              className={clsx(
                'transition-colors',
                form.is_active ? 'text-emerald-400' : 'text-gray-600'
              )}
            >
              {form.is_active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-800/60 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-dark-300 text-white rounded-xl font-medium hover:bg-dark-400 transition-all">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex-1 py-2.5 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Add Branch'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ branch, onConfirm, onCancel, deleting }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onCancel} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-200 border border-gray-800/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Delete Branch</h3>
              <p className="text-sm text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-gray-300 mb-2 text-sm">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-white">{branch?.name}</span>?
          </p>
          {(branch?.customer_count ?? 0) > 0 && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5 mb-4">
              <Crown className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300">
                This branch has {branch.customer_count} member{branch.customer_count !== 1 ? 's' : ''} assigned to it. Deleting may affect their records.
              </p>
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={onCancel} disabled={deleting} className="flex-1 py-2.5 bg-dark-300 text-white rounded-xl font-medium hover:bg-dark-400 transition-all disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : null}
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Comparison Table ──────────────────────────────────────────────────────────
function ComparisonTable({ branches }) {
  if (branches.length === 0) return null;

  const sorted = [...branches].sort((a, b) => (b.customer_count ?? 0) - (a.customer_count ?? 0));

  return (
    <div className="bg-dark-300 rounded-2xl border border-gray-800/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800/50">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gym-400" />
          Branch Comparison
        </h3>
      </div>
      <div className="divide-y divide-gray-800/50">
        {/* Header */}
        <div className="grid grid-cols-5 gap-4 px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">Branch</div>
          <div className="text-right">Members</div>
          <div className="text-right">Active</div>
          <div className="text-right">Active %</div>
        </div>

        {sorted.map((branch, i) => {
          const pct = branch.customer_count > 0
            ? Math.round((branch.active_count / branch.customer_count) * 100)
            : 0;
          return (
            <div key={branch.id} className="grid grid-cols-5 gap-4 px-5 py-3.5 items-center hover:bg-dark-400/30 transition-colors">
              <div className="col-span-2 flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-dark-400 text-xs font-bold text-gray-400 flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{branch.name}</p>
                  {branch.is_main && (
                    <p className="text-xs text-amber-400 flex items-center gap-0.5 mt-0.5">
                      <Crown className="w-3 h-3" /> Main
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right text-sm font-semibold text-white">{branch.customer_count ?? 0}</div>
              <div className="text-right text-sm font-semibold text-emerald-400">{branch.active_count ?? 0}</div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5">
                  <div className="w-12 h-1.5 bg-dark-400 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Empty Form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  id: null,
  name: '',
  address: '',
  phone: '',
  manager_name: '',
  is_active: true,
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Branches() {
  const toast = useToast();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [settingMain, setSettingMain] = useState(null);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/branches');
      setBranches(data.data || data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = branch => { setEditing(branch); setForm({ ...EMPTY_FORM, ...branch }); setShowForm(true); };
  const handleFormChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Branch name is required');

    setSaving(true);
    try {
      const payload = {
        name:         form.name.trim(),
        address:      form.address.trim() || null,
        phone:        form.phone.trim() || null,
        manager_name: form.manager_name.trim() || null,
        is_active:    form.is_active,
      };

      if (editing) {
        const res = await api.put(`/branches/${editing.id}`, payload);
        const updated = res.data || res;
        setBranches(prev => prev.map(b => b.id === editing.id ? { ...b, ...updated } : b));
        toast.success('Branch updated');
      } else {
        const res = await api.post('/branches', payload);
        const created = res.data || res;
        setBranches(prev => [...prev, created]);
        toast.success('Branch added');
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  const handleSetMain = async branch => {
    setSettingMain(branch.id);
    try {
      await api.put(`/branches/${branch.id}/set-main`);
      setBranches(prev => prev.map(b => ({ ...b, is_main: b.id === branch.id })));
      toast.success(`${branch.name} is now the main branch`);
    } catch (err) {
      toast.error(err.message || 'Failed to update main branch');
    } finally {
      setSettingMain(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/branches/${deleteTarget.id}`);
      setBranches(prev => prev.filter(b => b.id !== deleteTarget.id));
      toast.success('Branch deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete branch');
    } finally {
      setDeleting(false);
    }
  };

  // Stats
  const totalMembers = branches.reduce((s, b) => s + (b.customer_count ?? 0), 0);
  const totalActive  = branches.reduce((s, b) => s + (b.active_count ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Branch <span className="text-gym-400">Management</span>
          </h1>
          <p className="text-gray-400 mt-1">Manage your gym locations and branches</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadBranches} className="p-2.5 bg-dark-300 text-gray-400 hover:text-white rounded-xl border border-gray-700 hover:bg-dark-400 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-gym-500/30"
          >
            <Plus className="w-5 h-5" />
            Add Branch
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {branches.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-dark-300 rounded-2xl p-5 border border-gray-800/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gym-500/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-gym-400" />
              </div>
              <span className="text-sm text-gray-400">Locations</span>
            </div>
            <p className="text-2xl font-bold text-white">{branches.length}</p>
          </div>
          <div className="bg-dark-300 rounded-2xl p-5 border border-gray-800/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Total Members</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalMembers}</p>
          </div>
          <div className="bg-dark-300 rounded-2xl p-5 border border-gray-800/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-sm text-gray-400">Active Members</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalActive}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-gym-600/30 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-4 border-gym-500 border-t-transparent animate-spin" />
            </div>
          </div>
        </div>
      ) : branches.length === 0 ? (
        /* Empty state */
        <div className="bg-dark-300 rounded-2xl border border-gray-800/50 py-20 text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-xl font-semibold text-white mb-2">No branches yet</h3>
          <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto">
            Add your first location to start managing multiple gym branches.
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-gym-500/30"
          >
            <Plus className="w-5 h-5" />
            Add Your First Location
          </button>
        </div>
      ) : (
        <>
          {/* Branch Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {branches.map(branch => (
              <div key={branch.id} className={clsx(settingMain === branch.id && 'opacity-60 pointer-events-none')}>
                <BranchCard
                  branch={branch}
                  isMain={!!branch.is_main}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onSetMain={handleSetMain}
                />
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          {branches.length > 1 && <ComparisonTable branches={branches} />}
        </>
      )}

      {/* Form */}
      {showForm && (
        <BranchForm
          form={form}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteConfirm
          branch={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
