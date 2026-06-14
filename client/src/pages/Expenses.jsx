import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  X,
  Trash2,
  Edit,
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
  MoreHorizontal,
  Download,
  History,
  Repeat
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
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '00')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value: val, label });
  }
  return options;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(ym) {
  if (!ym) return '';
  const [year, month] = ym.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
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

// ── Monthly Bill Form (centered dialog) ──────────────────────────────────────
const EMPTY_RECURRING_FORM = {
  id: null,
  category: '',
  description: '',
  amount: '',
  payment_method: 'cash',
  day_of_month: 1,
  notes: '',
  staff_id: '',
};

// Day options 1-28
const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

function RecurringForm({ form, onChange, onSubmit, onClose, saving, staffList = [] }) {
  const isSalary = form.category === 'salaries';
  const selectedCat = CATEGORIES.find(c => c.value === form.category);

  const handleStaffSelect = (staffId) => {
    const staff = staffList.find(s => String(s.id) === String(staffId));
    onChange('staff_id', staffId);
    if (staff) onChange('description', `Salary — ${staff.name}`);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-200 border border-gray-800/60 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60 flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-white">
                {form.id ? 'Edit Monthly Bill' : 'Add Monthly Bill'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                This expense will be logged automatically each month
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-xl transition-all ml-4">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-6 py-5 space-y-4">

            {/* Bill name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Bill name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={e => onChange('description', e.target.value)}
                placeholder="e.g. Monthly rent, Electricity bill, Internet..."
                autoFocus
                className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors placeholder-gray-600"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Category <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => onChange('category', c.value)}
                    title={c.label}
                    className={clsx(
                      'flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-medium transition-all',
                      form.category === c.value
                        ? `${c.bg} ${c.border} ${c.color}`
                        : 'bg-dark-300 border-gray-700/60 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                    )}
                  >
                    <span className="text-base leading-none">{c.emoji}</span>
                    <span className="leading-tight text-center" style={{ fontSize: '10px' }}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Staff picker — only shown when category = salaries */}
            {isSalary && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Which staff member? <span className="text-red-400">*</span>
                </label>
                {staffList.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm text-yellow-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    No staff found. Add staff members first.
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
                          {s.name}{s.role ? ` — ${s.role.charAt(0).toUpperCase() + s.role.slice(1)}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>
            )}

            {/* Amount + Day side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Monthly amount (ETB) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={e => onChange('amount', e.target.value)}
                  placeholder="0"
                  className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gym-500/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Paid on which day?
                </label>
                <div className="relative">
                  <select
                    value={form.day_of_month}
                    onChange={e => onChange('day_of_month', Number(e.target.value))}
                    className="w-full bg-dark-300 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-gym-500/60 transition-colors pr-9"
                  >
                    {DAY_OPTIONS.map(d => (
                      <option key={d} value={d}>{ordinal(d)} of the month</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">How is it paid?</label>
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

            {/* Preview */}
            {form.description && form.amount && form.category && (
              <div className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border', selectedCat?.bg, selectedCat?.border)}>
                <span className="text-2xl">{selectedCat?.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-semibold truncate', selectedCat?.color)}>{form.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatCurrency(Number(form.amount))} every month · due {ordinal(Number(form.day_of_month))}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-800/60 flex gap-3 flex-shrink-0">
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
              ) : (form.id ? 'Save Changes' : 'Save Monthly Bill')}
            </button>
          </div>
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

  // ── Core expense state ────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState('list');
  const [expenses, setExpenses]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [summaryData, setSummaryData]   = useState(null);
  const [monthlyChart, setMonthlyChart] = useState([]);
  const [revenue, setRevenue]           = useState(0);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [filter, setFilter]             = useState({ month: currentMonth(), category: '' });
  const [search, setSearch]             = useState('');
  const [staffList, setStaffList]       = useState([]);

  // ── Recurring state ───────────────────────────────────────────────────────
  const [recurringTemplates, setRecurringTemplates]   = useState([]);
  const [recurringLoading, setRecurringLoading]       = useState(false);
  const [showRecurringForm, setShowRecurringForm]     = useState(false);
  const [recurringForm, setRecurringForm]             = useState(EMPTY_RECURRING_FORM);
  const [savingRecurring, setSavingRecurring]         = useState(false);
  const [deleteRecurringTarget, setDeleteRecurringTarget] = useState(null);
  const [deletingRecurring, setDeletingRecurring]     = useState(false);
  const [recurringStatus, setRecurringStatus]         = useState(null); // { template_count, generated }
  const [generatingRecurring, setGeneratingRecurring] = useState(false);

  // ── History state ─────────────────────────────────────────────────────────
  const [monthlyHistory, setMonthlyHistory]   = useState([]);
  const [historyLoading, setHistoryLoading]   = useState(false);

  const monthOptions = getMonthOptions();
  const cm = currentMonth();

  // ── Load expenses ─────────────────────────────────────────────────────────
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

  // ── Load staff list once on mount ─────────────────────────────────────────
  useEffect(() => {
    api.get('/staff')
      .then(d => setStaffList(Array.isArray(d) ? d : (d.staff || d.data || [])))
      .catch(() => {});
  }, []);

  // ── Load monthly chart & revenue ──────────────────────────────────────────
  useEffect(() => {
    api.get('/expenses/summary')
      .then(d => {
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

  // ── Load recurring templates + status on mount and when tab is active ───────
  const loadRecurringTemplates = useCallback(async () => {
    setRecurringLoading(true);
    try {
      const [data, status] = await Promise.all([
        api.get('/recurring-expenses'),
        api.get(`/recurring-expenses/status/${cm}`).catch(() => null),
      ]);
      setRecurringTemplates(Array.isArray(data) ? data : (data.data || []));
      if (status) setRecurringStatus(status);
    } catch (err) {
      toast.error(err.message || 'Failed to load recurring expenses');
    } finally {
      setRecurringLoading(false);
    }
  }, []);

  // Load on mount (so the List tab button shows immediately) and when tab opens
  useEffect(() => { loadRecurringTemplates(); }, []);
  useEffect(() => {
    if (activeTab === 'recurring') loadRecurringTemplates();
  }, [activeTab]);

  // ── Load monthly history when tab becomes active ──────────────────────────
  const loadMonthlyHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await api.get('/expenses/monthly-history');
      setMonthlyHistory(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      toast.error(err.message || 'Failed to load monthly history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') loadMonthlyHistory();
  }, [activeTab]);

  // ── Expense form helpers ──────────────────────────────────────────────────
  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (expense) => {
    setForm({
      id:             expense.id,
      date:           expense.expense_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      category:       expense.category || '',
      amount:         expense.amount || '',
      description:    expense.description || '',
      payment_method: expense.payment_method || 'cash',
      receipt_note:   expense.receipt_note || '',
      staff_id:       '',
    });
    setShowForm(true);
  };

  const handleFormChange = (key, val) => setForm(prev => ({
    ...prev,
    [key]: val,
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
      loadExpenses();
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

  // ── Recurring form helpers ────────────────────────────────────────────────
  const openAddRecurringForm = () => {
    setRecurringForm(EMPTY_RECURRING_FORM);
    setShowRecurringForm(true);
  };

  const openEditRecurringForm = (tpl) => {
    setRecurringForm({
      id:             tpl.id,
      category:       tpl.category || '',
      description:    tpl.description || '',
      amount:         tpl.amount || '',
      payment_method: tpl.payment_method || 'cash',
      day_of_month:   tpl.day_of_month || 1,
      notes:          tpl.notes || '',
      staff_id:       '',
    });
    setShowRecurringForm(true);
  };

  const handleRecurringFormChange = (key, val) => setRecurringForm(prev => ({
    ...prev,
    [key]: val,
    ...(key === 'category' && val !== 'salaries' ? { staff_id: '' } : {}),
  }));

  const handleRecurringSubmit = async () => {
    if (!recurringForm.category) return toast.error('Please select a category');
    if (recurringForm.category === 'salaries' && !recurringForm.staff_id) return toast.error('Please select a staff member for salary');
    if (!recurringForm.amount || Number(recurringForm.amount) <= 0) return toast.error('Please enter a valid amount');
    if (!recurringForm.description.trim()) return toast.error('Please enter a description');
    if (!recurringForm.day_of_month || recurringForm.day_of_month < 1 || recurringForm.day_of_month > 28) return toast.error('Day of month must be between 1 and 28');

    setSavingRecurring(true);
    try {
      const payload = {
        category:       recurringForm.category,
        description:    recurringForm.description.trim(),
        amount:         Number(recurringForm.amount),
        payment_method: recurringForm.payment_method,
        day_of_month:   Number(recurringForm.day_of_month),
        notes:          recurringForm.notes.trim() || undefined,
      };

      if (recurringForm.id) {
        await api.put(`/recurring-expenses/${recurringForm.id}`, payload);
        toast.success('Recurring expense updated');
      } else {
        await api.post('/recurring-expenses', payload);
        toast.success('Recurring expense added');
      }
      setShowRecurringForm(false);
      loadRecurringTemplates();
      // Refresh status banner
      api.get(`/recurring-expenses/status/${cm}`)
        .then(d => setRecurringStatus(d))
        .catch(() => {});
    } catch (err) {
      toast.error(err.message || 'Failed to save recurring expense');
    } finally {
      setSavingRecurring(false);
    }
  };

  const handleDeleteRecurring = async () => {
    if (!deleteRecurringTarget) return;
    setDeletingRecurring(true);
    try {
      await api.delete(`/recurring-expenses/${deleteRecurringTarget.id}`);
      setRecurringTemplates(prev => prev.filter(t => t.id !== deleteRecurringTarget.id));
      toast.success('Recurring expense deleted');
      setDeleteRecurringTarget(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete recurring expense');
    } finally {
      setDeletingRecurring(false);
    }
  };

  // ── Generate recurring ────────────────────────────────────────────────────
  const handleGenerateRecurring = async (force = false) => {
    setGeneratingRecurring(true);
    try {
      const result = await api.post('/recurring-expenses/generate', { month: cm, force });
      const count = result.expense_count ?? result.count ?? 0;
      toast.success(`${count} monthly bill${count !== 1 ? 's' : ''} logged for ${getMonthLabel(cm)}`);
      setRecurringStatus(prev => ({ ...(prev || {}), generated: true, expense_count: count }));
      loadExpenses();
    } catch (err) {
      toast.error(err.message || 'Failed to log monthly bills');
    } finally {
      setGeneratingRecurring(false);
    }
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCsv = async () => {
    try {
      const token = localStorage.getItem('token');
      const month = filter.month || cm;
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiBase}/expenses/export?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const csvText = await res.text();
      const url = URL.createObjectURL(new Blob([csvText], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || 'Failed to export CSV');
    }
  };

  // ── History CSV Export ────────────────────────────────────────────────────
  const handleExportHistoryCsv = () => {
    if (!monthlyHistory.length) return;
    const rows = [
      ['Month', 'Revenue', 'Expenses', 'Net Profit'],
      ...monthlyHistory.map(r => [
        r.month,
        r.revenue ?? 0,
        r.expenses ?? 0,
        (r.revenue ?? 0) - (r.expenses ?? 0),
      ]),
    ];
    const csvText = rows.map(r => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csvText], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = expenses.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.description?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    );
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalSpent = summaryData?.total || 0;
  const byCategory = summaryData?.byCategory || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHint id="expenses">
        The Monthly Bills tab is for fixed recurring costs — set up rent, salaries, and utilities once, then click "Log [Month] Bills" at the start of each month to add them all at once. If a log didn't apply correctly, click Re-log to clear the previous attempt and start fresh. Use the Add Expense button for one-off costs that don't recur. The History tab shows monthly revenue versus expenses and your net profit for the past 12 months.
      </PageHint>

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
          {activeTab === 'list' && (
            <>
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-300 hover:bg-dark-400 text-gray-300 hover:text-white rounded-xl font-medium border border-gray-700 transition-all"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              {/* Monthly bills button — always visible on list tab */}
              {recurringStatus?.generated ? (
                <div className="inline-flex items-center gap-1 rounded-xl overflow-hidden border border-emerald-500/30">
                  <span className="inline-flex items-center gap-2 px-3 py-2.5 bg-emerald-500/15 text-emerald-400 text-sm font-medium">
                    <span>✓</span>
                    Bills logged
                  </span>
                  <button
                    onClick={() => handleGenerateRecurring(true)}
                    disabled={generatingRecurring}
                    title="Re-log this month's bills"
                    className="px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-500 hover:text-emerald-300 text-xs font-medium transition-all disabled:opacity-50 border-l border-emerald-500/30"
                  >
                    {generatingRecurring ? (
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : 'Re-log'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => recurringTemplates.length > 0 ? handleGenerateRecurring(false) : setActiveTab('recurring')}
                  disabled={generatingRecurring}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-semibold transition-all disabled:opacity-60"
                >
                  {generatingRecurring ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <Zap className="w-4 h-4" />}
                  {recurringTemplates.length > 0 ? `Log ${getMonthLabel(cm)} Bills` : 'Set Up Monthly Bills'}
                </button>
              )}
              <button
                onClick={openAddForm}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-300 hover:bg-dark-400 text-gray-300 hover:text-white rounded-xl font-medium border border-gray-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
            </>
          )}
          {activeTab === 'recurring' && (
            <button
              onClick={openAddRecurringForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-gym-500/30"
            >
              <Plus className="w-5 h-5" />
              Add Monthly Bill
            </button>
          )}
          {activeTab === 'history' && (
            <button
              onClick={handleExportHistoryCsv}
              disabled={!monthlyHistory.length}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-300 hover:bg-dark-400 text-gray-300 hover:text-white rounded-xl font-medium border border-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export All (CSV)
            </button>
          )}
        </div>
      </div>


      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-dark-300 rounded-2xl p-1 border border-gray-800/50 w-fit">
        {[
          { id: 'list',      label: 'List',      icon: <Receipt className="w-4 h-4" /> },
          { id: 'recurring', label: 'Monthly Bills', icon: <Repeat className="w-4 h-4" /> },
          { id: 'history',   label: 'History',   icon: <History className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-gym-500 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-dark-400'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'list' && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <div className="col-span-2">
                        <span className="text-sm text-gray-400">{formatDate(expense.expense_date)}</span>
                      </div>

                      <div className="col-span-3 flex items-center gap-2">
                        <span className="text-lg">{cat.emoji}</span>
                        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-lg border', cat.bg, cat.color, cat.border)}>
                          {cat.label}
                        </span>
                      </div>

                      <div className="col-span-3">
                        <p className="text-sm text-gray-200 truncate">{expense.description}</p>
                        {expense.is_recurring ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gym-400 mt-0.5">
                            🔄 Recurring
                          </span>
                        ) : expense.receipt_note ? (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{expense.receipt_note}</p>
                        ) : null}
                      </div>

                      <div className="col-span-2 text-right">
                        <span className="text-sm font-semibold text-red-400">{formatCurrency(expense.amount)}</span>
                      </div>

                      <div className="col-span-1">
                        <span className="text-xs text-gray-500 capitalize">{(expense.payment_method || 'cash').replace('_', ' ')}</span>
                      </div>

                      <div className="col-span-1 flex justify-end gap-1">
                        <button
                          onClick={() => openEditForm(expense)}
                          className="p-1.5 text-gray-600 hover:text-gym-400 hover:bg-gym-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Edit expense"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
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
        </>
      )}

      {/* ── RECURRING TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'recurring' && (
        <div className="space-y-5">

          {/* Explainer */}
          <div className="bg-dark-300 rounded-2xl p-5 border border-gray-800/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gym-500/15 flex items-center justify-center flex-shrink-0">
                <Repeat className="w-5 h-5 text-gym-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">How Monthly Bills work</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Add expenses that repeat every month — like rent, salaries, and utilities.
                  You set them up <span className="text-white font-medium">once</span>, then at the start of each month
                  click <span className="text-white font-medium">"Log to this month"</span> and they all get added to your expense list automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Log-to-month action card */}
          {recurringTemplates.length > 0 && (
            recurringStatus?.generated ? (
              <div className="flex items-center gap-3 px-5 py-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 text-base">✓</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Already logged for {getMonthLabel(cm)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    All {recurringStatus.expense_count} monthly bills were added to your {getMonthLabel(cm)} expenses.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 bg-yellow-500/8 border border-yellow-500/25 rounded-2xl">
                <div>
                  <p className="text-sm font-semibold text-yellow-300">
                    {recurringTemplates.length} bill{recurringTemplates.length !== 1 ? 's' : ''} not yet logged for {getMonthLabel(cm)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Total: {formatCurrency(recurringTemplates.reduce((s, t) => s + Number(t.amount || 0), 0))} · Click to add them all to this month's expenses
                  </p>
                </div>
                <button
                  onClick={handleGenerateRecurring}
                  disabled={generatingRecurring}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-sm font-semibold transition-all disabled:opacity-60 whitespace-nowrap flex-shrink-0"
                >
                  {generatingRecurring ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <Zap className="w-4 h-4" />}
                  Log to {getMonthLabel(cm)}
                </button>
              </div>
            )
          )}

          {/* Bills list */}
          {recurringLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-gym-600/30 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-4 border-gym-500 border-t-transparent animate-spin" />
                </div>
              </div>
            </div>
          ) : recurringTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-dark-300 border border-dashed border-gray-700 flex items-center justify-center mb-5">
                <Repeat className="w-9 h-9 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No monthly bills yet</h3>
              <p className="text-gray-500 text-sm mb-1 max-w-xs">Add your fixed monthly costs — rent, salaries, utilities, internet — and log them all in one click each month.</p>
              <button
                onClick={openAddRecurringForm}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-gym-500 hover:bg-gym-400 text-white rounded-xl font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                Add First Monthly Bill
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recurringTemplates.map(tpl => {
                const cat = getCat(tpl.category);
                return (
                  <div
                    key={tpl.id}
                    className="bg-dark-300 rounded-2xl border border-gray-800/50 p-4 flex flex-col gap-3 group hover:border-gray-700 transition-colors"
                  >
                    {/* Top row: emoji + category badge + amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0', cat.bg)}>
                          {cat.emoji}
                        </div>
                        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-lg border', cat.bg, cat.color, cat.border)}>
                          {cat.label}
                        </span>
                      </div>
                      <span className="text-base font-bold text-red-400 flex-shrink-0">{formatCurrency(tpl.amount)}</span>
                    </div>

                    {/* Bill name */}
                    <div>
                      <p className="text-sm font-semibold text-white leading-snug">{tpl.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Every month on the <span className="text-gray-400">{ordinal(tpl.day_of_month)}</span>
                        {' · '}
                        <span className="capitalize">{(tpl.payment_method || 'cash').replace('_', ' ')}</span>
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1 border-t border-gray-800/60">
                      <button
                        onClick={() => openEditRecurringForm(tpl)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-dark-400 rounded-lg transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteRecurringTarget(tpl)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add new card */}
              <button
                onClick={openAddRecurringForm}
                className="bg-dark-300/50 rounded-2xl border border-dashed border-gray-700/60 p-4 flex flex-col items-center justify-center gap-2 hover:border-gym-500/40 hover:bg-dark-300 transition-all min-h-[140px] group"
              >
                <div className="w-9 h-9 rounded-xl bg-gym-500/10 group-hover:bg-gym-500/20 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5 text-gym-400" />
                </div>
                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-300 transition-colors">Add Monthly Bill</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-dark-300 rounded-2xl border border-gray-800/50 overflow-hidden">
          {historyLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-gym-600/30 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-4 border-gym-500 border-t-transparent animate-spin" />
                </div>
              </div>
            </div>
          ) : monthlyHistory.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-dark-400 flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No history yet</h3>
              <p className="text-gray-500 text-sm">Monthly history will appear here once you have expenses recorded.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {/* Header */}
              <div className="grid grid-cols-4 gap-3 px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div>Month</div>
                <div className="text-right">Revenue</div>
                <div className="text-right">Expenses</div>
                <div className="text-right">Net Profit</div>
              </div>

              {monthlyHistory.map((row, i) => {
                const net = (row.revenue ?? 0) - (row.expenses ?? 0);
                const isProfit = net >= 0;
                return (
                  <div
                    key={row.month || i}
                    className="grid grid-cols-4 gap-3 px-5 py-4 items-center hover:bg-dark-400/50 transition-colors"
                  >
                    <div className="text-sm font-medium text-white">{getMonthLabel(row.month)}</div>
                    <div className="text-right text-sm font-semibold text-emerald-400">{formatCurrency(row.revenue ?? 0)}</div>
                    <div className="text-right text-sm font-semibold text-red-400">{formatCurrency(row.expenses ?? 0)}</div>
                    <div className={clsx('text-right text-sm font-bold', isProfit ? 'text-emerald-400' : 'text-red-400')}>
                      {isProfit ? '+' : ''}{formatCurrency(net)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form panel — expense */}
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

      {/* Form panel — recurring */}
      {showRecurringForm && (
        <RecurringForm
          form={recurringForm}
          onChange={handleRecurringFormChange}
          onSubmit={handleRecurringSubmit}
          onClose={() => setShowRecurringForm(false)}
          saving={savingRecurring}
          staffList={staffList}
        />
      )}

      {/* Delete confirm — expense */}
      {deleteTarget && (
        <DeleteConfirm
          expense={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* Delete confirm — recurring */}
      {deleteRecurringTarget && (
        <DeleteConfirm
          expense={deleteRecurringTarget}
          onConfirm={handleDeleteRecurring}
          onCancel={() => setDeleteRecurringTarget(null)}
          deleting={deletingRecurring}
        />
      )}
    </div>
  );
}
