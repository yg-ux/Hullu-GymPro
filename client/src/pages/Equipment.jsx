import { useState, useEffect, useCallback } from 'react';
import { api, formatCurrency, formatDate } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  X,
  Trash2,
  Search,
  ChevronDown,
  Edit,
  Dumbbell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Wrench,
  Package,
  Calendar,
  DollarSign,
  RefreshCw,
  ChevronRight,
  FileText,
  Tag,
  Activity
} from 'lucide-react';
import clsx from 'clsx';

// ── Config ────────────────────────────────────────────────────────────────────
const STATUSES = [
  { value: 'operational', label: 'Operational', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  { value: 'maintenance', label: 'Maintenance',  color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  { value: 'broken',      label: 'Broken',       color: 'text-red-400',    bg: 'bg-red-500/20',    border: 'border-red-500/30',    dot: 'bg-red-400' },
  { value: 'retired',     label: 'Retired',      color: 'text-gray-400',   bg: 'bg-gray-500/20',   border: 'border-gray-500/30',   dot: 'bg-gray-400' },
];

const CONDITIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
  { value: 'poor',      label: 'Poor' },
];

const EQUIPMENT_CATEGORIES = [
  'Cardio', 'Strength', 'Free Weights', 'Machines', 'Functional',
  'Stretching', 'Boxing', 'Accessories', 'Other',
];

function getStatus(value) {
  return STATUSES.find(s => s.value === value) || STATUSES[0];
}

function isServiceDue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  return diff <= 30; // due within 30 days or overdue
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryBadge({ label, count, icon: Icon, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 bg-dark-300 rounded-2xl p-4 border transition-all text-left',
        active ? 'border-gym-500/50 ring-2 ring-gym-500/20' : 'border-gray-800/50 hover:border-gray-700'
      )}
    >
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color.bg)}>
        <Icon className={clsx('w-5 h-5', color.text)} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{count}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </button>
  );
}

// ── Equipment Card ────────────────────────────────────────────────────────────
function EquipmentCard({ item, onEdit, onDelete, onSelect }) {
  const st = getStatus(item.status);
  const due = isServiceDue(item.next_service_date);
  const overdue = isOverdue(item.next_service_date);

  return (
    <div
      className="bg-dark-300 rounded-2xl border border-gray-800/50 hover:border-gym-500/30 p-5 transition-all cursor-pointer hover:shadow-lg hover:shadow-gym-500/5 group"
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
          {/* Condition dot */}
          <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', st.dot)} />
          <h3 className="font-semibold text-white truncate">{item.name}</h3>
        </div>
        {/* Status badge */}
        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-lg border flex-shrink-0', st.bg, st.color, st.border)}>
          {st.label}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
        <Tag className="w-3 h-3" />
        {item.category || 'Uncategorized'}
      </p>

      {item.purchase_price && (
        <p className="text-sm text-gray-400 mb-2 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-gray-600" />
          {formatCurrency(item.purchase_price)}
        </p>
      )}

      {item.next_service_date && (
        <div className={clsx(
          'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg mt-3',
          overdue ? 'bg-red-500/10 text-red-400' : due ? 'bg-orange-500/10 text-orange-400' : 'bg-dark-400 text-gray-500'
        )}>
          <Wrench className="w-3 h-3" />
          <span>
            {overdue ? 'Service overdue · ' : due ? 'Due soon · ' : 'Next service · '}
            {formatDate(item.next_service_date)}
          </span>
        </div>
      )}

      {/* Hover actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800/50 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={e => { e.stopPropagation(); onEdit(item); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-dark-400 hover:bg-gym-500/20 text-gray-400 hover:text-gym-400 rounded-lg text-xs font-medium transition-all"
        >
          <Edit className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(item); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-dark-400 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg text-xs font-medium transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function EquipmentDetail({ item, onClose, onLogService, onEdit }) {
  const st = getStatus(item.status);
  const overdue = isOverdue(item.next_service_date);
  const due = isServiceDue(item.next_service_date);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-200 border border-gray-800/60 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-800/60">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={clsx('w-2.5 h-2.5 rounded-full', st.dot)} />
                <h2 className="text-xl font-semibold text-white">{item.name}</h2>
              </div>
              <p className="text-sm text-gray-400">{item.category}</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-xl transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Status</span>
              <span className={clsx('text-xs font-medium px-3 py-1 rounded-lg border', st.bg, st.color, st.border)}>{st.label}</span>
            </div>

            {/* Condition */}
            {item.condition && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Condition</span>
                <span className="text-sm text-gray-200 capitalize">{item.condition}</span>
              </div>
            )}

            {/* Purchase info */}
            {item.purchase_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Purchased</span>
                <span className="text-sm text-gray-200">{formatDate(item.purchase_date)}</span>
              </div>
            )}
            {item.purchase_price && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Purchase Price</span>
                <span className="text-sm font-semibold text-white">{formatCurrency(item.purchase_price)}</span>
              </div>
            )}

            {/* Warranty */}
            {item.warranty_expiry && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Warranty Expiry</span>
                <span className={clsx('text-sm', isOverdue(item.warranty_expiry) ? 'text-red-400' : 'text-gray-200')}>
                  {formatDate(item.warranty_expiry)}
                  {isOverdue(item.warranty_expiry) && ' (expired)'}
                </span>
              </div>
            )}

            {/* Next service */}
            {item.next_service_date && (
              <div className={clsx('flex items-center justify-between p-3 rounded-xl', overdue ? 'bg-red-500/10' : due ? 'bg-orange-500/10' : 'bg-dark-300')}>
                <span className="text-sm text-gray-400">Next Service</span>
                <span className={clsx('text-sm font-medium', overdue ? 'text-red-400' : due ? 'text-orange-400' : 'text-gray-200')}>
                  {formatDate(item.next_service_date)}
                  {overdue && ' — OVERDUE'}
                  {!overdue && due && ' — Due Soon'}
                </span>
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="bg-dark-300 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-300">{item.notes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-800/60">
            <button
              onClick={() => { onClose(); onEdit(item); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-dark-300 hover:bg-dark-400 text-gray-200 rounded-xl font-medium transition-all"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => onLogService(item)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-semibold transition-all"
            >
              <Wrench className="w-4 h-4" />
              Log Service
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Service Log Form ──────────────────────────────────────────────────────────
function ServiceForm({ item, onClose, onSubmit, saving }) {
  const [serviceForm, setServiceForm] = useState({
    next_service_date: '',
    condition: item.condition || 'good',
    status: item.status || 'operational',
    notes: '',
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-200 border border-gray-800/60 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-800/60">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-gym-400" />
              Log Service — {item.name}
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-xl transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Next Service Date</label>
              <input
                type="date"
                value={serviceForm.next_service_date}
                onChange={e => setServiceForm(prev => ({ ...prev, next_service_date: e.target.value }))}
                className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Condition After Service</label>
              <div className="relative">
                <select
                  value={serviceForm.condition}
                  onChange={e => setServiceForm(prev => ({ ...prev, condition: e.target.value }))}
                  className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-gym-500/60 transition-colors pr-9"
                >
                  {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Update Status</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setServiceForm(prev => ({ ...prev, status: s.value }))}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
                      serviceForm.status === s.value
                        ? `${s.bg} ${s.color} ${s.border}`
                        : 'bg-dark-300 border-gray-700 text-gray-400 hover:bg-dark-400'
                    )}
                  >
                    <span className={clsx('w-2 h-2 rounded-full', s.dot)} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Service Notes</label>
              <textarea
                value={serviceForm.notes}
                onChange={e => setServiceForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Describe what was done..."
                rows={3}
                className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-gray-800/60">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-dark-300 text-white rounded-xl font-medium hover:bg-dark-400 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(serviceForm)}
              disabled={saving}
              className="flex-1 py-2.5 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <Wrench className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Log Service'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Equipment Form ────────────────────────────────────────────────────────────
function EquipmentForm({ form, onChange, onSubmit, onClose, saving }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-dark-200 border-l border-gray-800/60 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-gym-400" />
            {form.id ? 'Edit Equipment' : 'Add Equipment'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Equipment Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => onChange('name', e.target.value)}
              placeholder="e.g. Treadmill Pro 3000"
              className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Category</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={e => onChange('category', e.target.value)}
                className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-gym-500/60 transition-colors pr-9"
              >
                <option value="">Select category</option>
                {EQUIPMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Status & Condition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Status</label>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={e => onChange('status', e.target.value)}
                  className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-gym-500/60 transition-colors pr-9"
                >
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Condition</label>
              <div className="relative">
                <select
                  value={form.condition}
                  onChange={e => onChange('condition', e.target.value)}
                  className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-gym-500/60 transition-colors pr-9"
                >
                  {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Purchase Date & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Purchase Date</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={e => onChange('purchase_date', e.target.value)}
                className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Purchase Price (ETB)</label>
              <input
                type="number"
                min="0"
                value={form.purchase_price}
                onChange={e => onChange('purchase_price', e.target.value)}
                placeholder="0"
                className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
              />
            </div>
          </div>

          {/* Warranty Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Warranty Expiry <span className="text-gray-600">(optional)</span></label>
            <input
              type="date"
              value={form.warranty_expiry}
              onChange={e => onChange('warranty_expiry', e.target.value)}
              className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
            />
          </div>

          {/* Next Service Date */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Next Service Date <span className="text-gray-600">(optional)</span></label>
            <input
              type="date"
              value={form.next_service_date}
              onChange={e => onChange('next_service_date', e.target.value)}
              className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Notes <span className="text-gray-600">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={e => onChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors resize-none"
            />
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
            {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Add Equipment'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ item, onConfirm, onCancel, deleting }) {
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
              <h3 className="font-semibold text-white">Delete Equipment</h3>
              <p className="text-sm text-gray-400">This cannot be undone.</p>
            </div>
          </div>
          <p className="text-gray-300 mb-6 text-sm">
            Remove <span className="font-semibold text-white">{item?.name}</span> from your equipment list?
          </p>
          <div className="flex gap-3">
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

// ── Empty Form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  id: null,
  name: '',
  category: '',
  status: 'operational',
  condition: 'good',
  purchase_date: '',
  purchase_price: '',
  warranty_expiry: '',
  next_service_date: '',
  notes: '',
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Equipment() {
  const toast = useToast();

  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [summary, setSummary]     = useState({ total: 0, operational: 0, maintenance: 0, broken: 0, service_due: 0 });
  const [selected, setSelected]   = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [showService, setShowService] = useState(null);
  const [savingService, setSavingService] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [filter, setFilter]       = useState({ status: '', category: '' });
  const [search, setSearch]       = useState('');

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/equipment');
      const list = data.data || data || [];
      setEquipment(list);
      // Compute summary
      const now = new Date();
      setSummary({
        total:       list.length,
        operational: list.filter(e => e.status === 'operational').length,
        maintenance: list.filter(e => e.status === 'maintenance').length,
        broken:      list.filter(e => e.status === 'broken').length,
        service_due: list.filter(e => e.next_service_date && isServiceDue(e.next_service_date)).length,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEquipment(); }, [loadEquipment]);

  const openAdd = () => { setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = item => { setForm({ ...EMPTY_FORM, ...item, purchase_price: item.purchase_price || '', purchase_date: item.purchase_date?.slice(0,10) || '', warranty_expiry: item.warranty_expiry?.slice(0,10) || '', next_service_date: item.next_service_date?.slice(0,10) || '' }); setShowForm(true); };
  const handleFormChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Equipment name is required');
    if (!form.category)    return toast.error('Please select a category');

    setSaving(true);
    try {
      const payload = {
        name:              form.name.trim(),
        category:          form.category,
        status:            form.status,
        condition:         form.condition,
        purchase_date:     form.purchase_date || null,
        purchase_price:    form.purchase_price ? Number(form.purchase_price) : null,
        warranty_expiry:   form.warranty_expiry || null,
        next_service_date: form.next_service_date || null,
        notes:             form.notes.trim() || null,
      };

      if (form.id) {
        const res = await api.put(`/equipment/${form.id}`, payload);
        const updated = res.data || res;
        setEquipment(prev => prev.map(e => e.id === form.id ? updated : e));
        toast.success('Equipment updated');
      } else {
        const res = await api.post('/equipment', payload);
        const created = res.data || res;
        setEquipment(prev => [created, ...prev]);
        toast.success('Equipment added');
      }
      setShowForm(false);
      loadEquipment();
    } catch (err) {
      toast.error(err.message || 'Failed to save equipment');
    } finally {
      setSaving(false);
    }
  };

  const handleServiceSubmit = async serviceData => {
    if (!showService) return;
    setSavingService(true);
    try {
      const res = await api.post(`/equipment/${showService.id}/service`, serviceData);
      const updated = res.data || res;
      setEquipment(prev => prev.map(e => e.id === showService.id ? { ...e, ...updated } : e));
      toast.success('Service logged successfully');
      setShowService(null);
      loadEquipment();
    } catch (err) {
      toast.error(err.message || 'Failed to log service');
    } finally {
      setSavingService(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/equipment/${deleteTarget.id}`);
      setEquipment(prev => prev.filter(e => e.id !== deleteTarget.id));
      toast.success('Equipment deleted');
      setDeleteTarget(null);
      loadEquipment();
    } catch (err) {
      toast.error(err.message || 'Failed to delete equipment');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered
  const filtered = equipment.filter(e => {
    if (filter.status && e.status !== filter.status) return false;
    if (filter.category && e.category !== filter.category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.name?.toLowerCase().includes(q) && !e.category?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Equipment <span className="text-gym-400">& Assets</span>
          </h1>
          <p className="text-gray-400 mt-1">Track your gym equipment and maintenance schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadEquipment} className="p-2.5 bg-dark-300 text-gray-400 hover:text-white rounded-xl border border-gray-700 hover:bg-dark-400 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-gym-500/30"
          >
            <Plus className="w-5 h-5" />
            Add Equipment
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryBadge label="Total Items"  count={summary.total}       icon={Dumbbell}      color={{ bg: 'bg-gym-500/20',     text: 'text-gym-400' }}     onClick={() => setFilter({ status: '', category: '' })} active={!filter.status} />
        <SummaryBadge label="Operational"  count={summary.operational} icon={CheckCircle}   color={{ bg: 'bg-emerald-500/20', text: 'text-emerald-400' }} onClick={() => setFilter(f => ({ ...f, status: f.status === 'operational' ? '' : 'operational' }))} active={filter.status === 'operational'} />
        <SummaryBadge label="Maintenance"  count={summary.maintenance} icon={Wrench}        color={{ bg: 'bg-yellow-500/20',  text: 'text-yellow-400' }}  onClick={() => setFilter(f => ({ ...f, status: f.status === 'maintenance' ? '' : 'maintenance' }))} active={filter.status === 'maintenance'} />
        <SummaryBadge label="Broken"       count={summary.broken}      icon={XCircle}       color={{ bg: 'bg-red-500/20',     text: 'text-red-400' }}     onClick={() => setFilter(f => ({ ...f, status: f.status === 'broken' ? '' : 'broken' }))} active={filter.status === 'broken'} />
      </div>

      {/* Service due alert */}
      {summary.service_due > 0 && (
        <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-2xl px-5 py-3.5">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <p className="text-sm text-orange-300">
            <span className="font-semibold">{summary.service_due} item{summary.service_due !== 1 ? 's' : ''}</span> due for service or overdue — schedule maintenance soon.
          </p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-dark-300 rounded-2xl p-4 border border-gray-800/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search equipment..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-dark-400 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gym-500/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={filter.status}
            onChange={e => setFilter(prev => ({ ...prev, status: e.target.value }))}
            className="bg-dark-400 border border-gray-700 rounded-xl px-3 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-gym-500/50 transition-colors"
          >
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filter.category}
            onChange={e => setFilter(prev => ({ ...prev, category: e.target.value }))}
            className="bg-dark-400 border border-gray-700 rounded-xl px-3 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-gym-500/50 transition-colors"
          >
            <option value="">All categories</option>
            {EQUIPMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-gym-600/30 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-4 border-gym-500 border-t-transparent animate-spin" />
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dark-300 rounded-2xl border border-gray-800/50 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-dark-400 flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No equipment found</h3>
          <p className="text-gray-500 text-sm mb-6">
            {search || filter.status || filter.category
              ? 'Try adjusting your filters'
              : 'Start tracking your gym equipment'}
          </p>
          {!search && !filter.status && !filter.category && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Equipment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <EquipmentCard
              key={item.id}
              item={item}
              onEdit={openEdit}
              onDelete={t => setDeleteTarget(t)}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {selected && (
        <EquipmentDetail
          item={selected}
          onClose={() => setSelected(null)}
          onLogService={item => { setSelected(null); setShowService(item); }}
          onEdit={item => { setSelected(null); openEdit(item); }}
        />
      )}

      {showService && (
        <ServiceForm
          item={showService}
          onClose={() => setShowService(null)}
          onSubmit={handleServiceSubmit}
          saving={savingService}
        />
      )}

      {showForm && (
        <EquipmentForm
          form={form}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          item={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
