import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  X,
  Trash2,
  Search,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Calendar,
  CreditCard,
  AlertTriangle,
  Receipt,
  BarChart3,
  RefreshCw,
  Building2,
  Zap,
  Users,
  Dumbbell,
  Megaphone,
  Wrench,
  Package,
  Shield,
  FileText,
  MoreHorizontal
} from 'lucide-react';
import clsx from 'clsx';
import PageHint from '../components/PageHint';

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'rent',        label: 'Rent',        emoji: '🏢', color: 'text-blue-400',   bg: 'bg-blue-500/20',   border: 'border-blue-500/30' },
  { value: 'utilities',   label: 'Utilities',   emoji: '⚡', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  { value: 'salaries',    label: 'Salaries',    emoji: '👥', color: 'text-green-400',  bg: 'bg-green-500/20',  border: 'border-green-500/30' },
  { value: 'equipment',   label: 'Equipment',   emoji: '🏋️', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  { value: 'marketing',   label: 'Marketing',   emoji: '📢', color: 'text-pink-400',   bg: 'bg-pink-500/20',   border: 'border-pink-500/30' },
  { value: 'maintenance', label: 'Maintenance', emoji: '🔧', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  { value: 'supplies',    label: 'Supplies',    emoji: '📦', color: 'text-cyan-400',   bg: 'bg-cyan-500/20',   border: 'border-cyan-500/30' },
  { value: 'insurance',   label: 'Insurance',   emoji: '🛡️', color: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30' },
  { value: 'taxes',       label: 'Taxes',       emoji: '🧾', color: 'text-red-400',    bg: 'bg-red-500/20',    border: 'border-red-500/30' },
  { value: 'other',       label: 'Other',       emoji: '📌', color: 'text-gray-400',   bg: 'bg-gray-500/20',   border: 'border-gray-500/30' },
];

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'card',          label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

function getCat(value) {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value: val, label });
  }
  return options;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Mini bar chart (CSS bars) ─────────────────────────────────────────────────
function MonthlyBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="bg-dark-300 rounded-2xl p-5 border border-gray-800/50">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-gym-400" />
        Last 6 Months
      </h3>
      <div className="flex items-end gap-2 h-28">
        {data.map((d, i) => {
          const pct = (d.total / max) * 100;
          const label = d.month ? d.month.slice(5) : '';
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                <div
                  className="w-full rounded-t-md bg-gym-500/60 hover:bg-gym-500/80 transition-all duration-500 relative group"
                  style={{ height: `${Math.max(pct, 3)}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-200 text-gray-200 text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-gray-700">
                    {formatCurrency(d.total)}
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── P&L Section ───────────────────────────────────────────────────────────────
function ProfitLoss({ revenue, expenses }) {
  const net = (revenue || 0) - (expenses || 0);
  const isProfit = net >= 0;

  return (
    <div className="bg-dark-300 rounded-2xl p-5 border border-gray-800/50">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        {isProfit ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
        Profit & Loss — This Month
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Revenue</span>
          <span className="text-sm font-semibold text-emerald-400">{formatCurrency(revenue || 0)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Expenses</span>
          <span className="text-sm font-semibold text-red-400">− {formatCurrency(expenses || 0)}</span>
        </div>
        <div className="h-px bg-gray-700/60 my-2" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Net {isProfit ? 'Profit' : 'Loss'}</span>
          <span className={clsx('text-base font-bold', isProfit ? 'text-emerald-400' : 'text-red-400')}>
            {isProfit ? '+' : ''}{formatCurrency(net)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Add/Edit Form ─────────────────────────────────────────────────────────────
function ExpenseForm({ form, onChange, onSubmit, onClose, saving, staffList = [] }) {
  const isSalary = form.category === 'salaries';

  const handleStaffSelect = (staffId) => {
    const staff = staffList.find(s => String(s.id) === String(staffId));
    onChange('staff_id', staffId);
    if (staff) onChange('description', `Salary — ${staff.name}`);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-dark-200 border-l border-gray-800/60 z-50 flex flex-col shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gym-400" />
            {form.id ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Expense Date <span className="text-gray-500 font-normal">(pick any past or future date)</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gym-400 pointer-events-none z-10" />
              <input
                type="date"
                value={form.date}
                onChange={e => onChange('date', e.target.value)}
                className="w-full bg-dark-300 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors [color-scheme:dark]"
              />
            </div>
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
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Staff picker — only shown when category = salaries */}
          {isSalary && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Staff Member <span className="text-red-400">*</span>
              </label>
              {staffList.length === 0 ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm text-yellow-400">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    No staff found. Add staff members first.
                  </div>
                  <Link
                    to="/staff"
                    onClick={onClose}
                    className="flex-shrink-0 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 text-xs font-semibold rounded-lg transition-all"
                  >
                    Go to Staff →
                  </Link>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={form.staff_id || ''}
                    onChange={e => handleStaffSelect(e.target.value)}
                    className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-gym-500/60 transition-colors pr-9"
                  >
                    <option value="">Select staff member</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.role ? s.role.charAt(0).toUpperCase() + s.role.slice(1) : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Amount (ETB)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={e => onChange('amount', e.target.value)}
              placeholder="0.00"
              className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => onChange('description', e.target.value)}
              placeholder="Brief description..."
              className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Payment Method</label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => onChange('payment_method', m.value)}
                  className={clsx(
                    'flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all',
                    form.payment_method === m.value
                      ? 'bg-gym-500/20 border-gym-500/50 text-gym-400'
                      : 'bg-dark-300 border-gray-700 text-gray-400 hover:bg-dark-400 hover:text-gray-200'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Receipt Note */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Receipt Note <span className="text-gray-600">(optional)</span></label>
            <textarea
              value={form.receipt_note}
              onChange={e => onChange('receipt_note', e.target.value)}
              placeholder="Receipt number or additional notes..."
              rows={3}
              className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800/60 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-dark-300 text-white rounded-xl font-medium hover:bg-dark-400 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (form.id ? 'Save Changes' : 'Add Expense')}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ expense, onConfirm, onCancel, deleting }) {
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
              <h3 className="font-semibold text-white">Delete Expense</h3>
              <p className="text-sm text-gray-400">This cannot be undone.</p>
            </div>
          </div>
          <p className="text-gray-300 mb-6 text-sm">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-white">{expense?.description || 'this expense'}</span>{' '}
            ({formatCurrency(expense?.amount)})?
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 bg-dark-300 text-white rounded-xl font-medium hover:bg-dark-400 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : null}
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  id: null,
  date: new Date().toISOString().slice(0, 10),
  category: '',
  amount: '',
  description: '',
  payment_method: 'cash',
  receipt_note: '',
  staff_id: '',
};

export default function Expenses() {
  const toast = useToast();

  const [expenses, setExpenses]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [monthlyChart, setMonthlyChart] = useState([]);
  const [revenue, setRevenue]         = useState(0);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [filter, setFilter]           = useState({ month: currentMonth(), category: '' });
  const [search, setSearch]           = useState('');
  const [staffList, setStaffList]     = useState([]);

  const monthOptions = getMonthOptions();

  // Load expenses
  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.month)    params.append('month', filter.month);
      if (filter.category) params.append('category', filter.category);
      const data = await api.get(`/expenses?${params.toString()}`);
      setExpenses(data.data || []);
      setSummaryData(data.summary || null);
    } catch (err) {
      toast.error(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Load staff list once on mount (used for salary expense picker)
  useEffect(() => {
    api.get('/staff')
      .then(d => setStaffList(Array.isArray(d) ? d : (d.staff || d.data || [])))
      .catch(() => {});
  }, []);

  // Load monthly chart (last 12 months) & revenue
  useEffect(() => {
    api.get('/expenses/summary')
      .then(d => {
        // summary endpoint returns array of {month, total, byCategory}
        const last6 = Array.isArray(d) ? d.slice(-6) : [];
        setMonthlyChart(last6);
      })
      .catch(() => {});
    api.get('/stats/revenue')
      .then(d => setRevenue(d.this_month || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Form helpers
  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleFormChange = (key, val) => setForm(prev => ({
    ...prev,
    [key]: val,
    // clear staff_id when category changes away from salaries
    ...(key === 'category' && val !== 'salaries' ? { staff_id: '' } : {}),
  }));

  const handleSubmit = async () => {
    if (!form.category)  return toast.error('Please select a category');
    if (form.category === 'salaries' && !form.staff_id) return toast.error('Please select a staff member for salary');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Please enter a valid amount');
    if (!form.description.trim()) return toast.error('Please enter a description');

    setSaving(true);
    try {
      const payload = {
        expense_date: form.date,
        category: form.category,
        amount: Number(form.amount),
        description: form.description.trim(),
        payment_method: form.payment_method,
        receipt_note: form.receipt_note.trim() || undefined,
      };

      if (form.id) {
        const updated = await api.put(`/expenses/${form.id}`, payload);
        setExpenses(prev => prev.map(e => e.id === form.id ? (updated.data || updated) : e));
        toast.success('Expense updated');
      } else {
        const created = await api.post('/expenses', payload);
        setExpenses(prev => [created.data || created, ...prev]);
        toast.success('Expense added');
      }
      setShowForm(false);
      loadExpenses(); // refresh summary
    } catch (err) {
      toast.error(err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${deleteTarget.id}`);
      setExpenses(prev => prev.filter(e => e.id !== deleteTarget.id));
      toast.success('Expense deleted');
      setDeleteTarget(null);
      loadExpenses();
    } catch (err) {
      toast.error(err.message || 'Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered list
  const filtered = expenses.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.description?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    );
  });

  // Stats
  const totalSpent   = summaryData?.total || 0;
  const byCategory   = summaryData?.byCategory || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHint id="expenses">Log everything your gym spends money on — rent, utilities, salaries, equipment, and more. Select a month to see a breakdown by category. The Profit & Loss section compares your revenue against expenses for the month.</PageHint>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Expense <span className="text-gym-400">Tracker</span>
          </h1>
          <p className="text-gray-400 mt-1">Track and manage your gym's operating costs</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadExpenses} className="p-2.5 bg-dark-300 text-gray-400 hover:text-white rounded-xl border border-gray-700 hover:bg-dark-400 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-gym-500/30"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spent */}
        <div className="bg-dark-300 rounded-2xl p-5 border border-gray-800/50 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-sm text-gray-400">Total Spent</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalSpent)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {filter.month ? monthOptions.find(m => m.value === filter.month)?.label : 'This Month'}
          </p>
        </div>

        {/* Top categories */}
        {byCategory.slice(0, 3).map(cat => {
          const c = getCat(cat.category);
          return (
            <div key={cat.category} className="bg-dark-300 rounded-2xl p-5 border border-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{c.emoji}</span>
                <span className="text-sm text-gray-400">{c.label}</span>
              </div>
              <p className="text-xl font-bold text-white">{formatCurrency(cat.total)}</p>
              <p className="text-xs text-gray-500 mt-1">{cat.count} expense{cat.count !== 1 ? 's' : ''}</p>
            </div>
          );
        })}

        {/* Fill remaining slots if < 3 categories */}
        {byCategory.length < 3 && Array.from({ length: 3 - byCategory.length }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-dark-300/40 rounded-2xl p-5 border border-dashed border-gray-800/40 hidden lg:block" />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyBarChart data={monthlyChart} />
        <ProfitLoss revenue={revenue} expenses={totalSpent} />
      </div>

      {/* Filter Bar */}
      <div className="bg-dark-300 rounded-2xl p-4 border border-gray-800/50 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search expenses..."
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

        {/* Month picker */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <select
            value={filter.month}
            onChange={e => setFilter(prev => ({ ...prev, month: e.target.value }))}
            className="bg-dark-400 border border-gray-700 rounded-xl pl-9 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-gym-500/50 transition-colors"
          >
            <option value="">All months</option>
            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>

        {/* Category */}
        <div className="relative">
          <select
            value={filter.category}
            onChange={e => setFilter(prev => ({ ...prev, category: e.target.value }))}
            className="bg-dark-400 border border-gray-700 rounded-xl px-3 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-gym-500/50 transition-colors"
          >
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Expense List */}
      <div className="bg-dark-300 rounded-2xl border border-gray-800/50 overflow-hidden">
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
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-dark-400 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No expenses found</h3>
            <p className="text-gray-500 text-sm mb-6">
              {search || filter.category
                ? 'Try adjusting your filters'
                : 'Start by adding your first expense'}
            </p>
            {!search && !filter.category && (
              <button
                onClick={openAddForm}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Category</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1">Method</div>
              <div className="col-span-1" />
            </div>

            {filtered.map(expense => {
              const cat = getCat(expense.category);
              return (
                <div
                  key={expense.id}
                  className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-dark-400/50 transition-colors group"
                >
                  {/* Date */}
                  <div className="col-span-2">
                    <span className="text-sm text-gray-400">{formatDate(expense.expense_date)}</span>
                  </div>

                  {/* Category */}
                  <div className="col-span-3 flex items-center gap-2">
                    <span className="text-lg">{cat.emoji}</span>
                    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-lg border', cat.bg, cat.color, cat.border)}>
                      {cat.label}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="col-span-3">
                    <p className="text-sm text-gray-200 truncate">{expense.description}</p>
                    {expense.receipt_note && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{expense.receipt_note}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-red-400">{formatCurrency(expense.amount)}</span>
                  </div>

                  {/* Method */}
                  <div className="col-span-1">
                    <span className="text-xs text-gray-500 capitalize">{(expense.payment_method || 'cash').replace('_', ' ')}</span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => setDeleteTarget(expense)}
                      className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total row */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 bg-dark-300 rounded-2xl border border-gray-800/50">
          <span className="text-sm text-gray-400">{filtered.length} expense{filtered.length !== 1 ? 's' : ''}</span>
          <span className="text-sm font-bold text-white">
            Total: <span className="text-red-400">{formatCurrency(filtered.reduce((s, e) => s + (e.amount || 0), 0))}</span>
          </span>
        </div>
      )}

      {/* Form panel */}
      {showForm && (
        <ExpenseForm
          form={form}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          saving={saving}
          staffList={staffList}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          expense={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
