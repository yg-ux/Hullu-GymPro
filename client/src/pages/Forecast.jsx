import { useState, useEffect } from 'react';
import { api, formatCurrency, getMembershipLabel } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Users,
  Calendar,
  RefreshCw,
  Send,
  BarChart3,
  ChevronRight,
  Clock,
  Info,
} from 'lucide-react';
import clsx from 'clsx';

function formatMonth(yyyyMm) {
  if (!yyyyMm) return '';
  const [y, m] = yyyyMm.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function StatCard({ icon: Icon, label, value, sub, color = 'gym' }) {
  const colorMap = {
    gym:   { bg: 'bg-gym-500/10',   text: 'text-gym-400',   border: 'border-gym-500/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    red:   { bg: 'bg-red-500/10',   text: 'text-red-400',   border: 'border-red-500/20' },
  };
  const c = colorMap[color] || colorMap.gym;
  return (
    <div className={`bg-dark-300 rounded-2xl border ${c.border} p-5 flex items-start gap-4`}>
      <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-black mt-0.5 ${c.text}`}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MemberRow({ member, onSendReminder, actionLabel = 'Send Reminder', actionColor = 'gym' }) {
  const colorMap = {
    gym: 'bg-gym-500/15 text-gym-400 hover:bg-gym-500/25 border-gym-500/30',
    red: 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border-red-500/30',
  };
  const btnCls = colorMap[actionColor] || colorMap.gym;

  const daysLeft = member.days_until_expiry ?? member.days_left ?? 0;
  const daysColor = daysLeft <= 7 ? 'text-red-400' : daysLeft <= 14 ? 'text-amber-400' : 'text-gray-300';

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-dark-400/40 transition-colors group">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gym-500 to-gym-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {member.name?.charAt(0).toUpperCase() || '?'}
      </div>
      {/* Name + Type */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{member.name}</p>
        <p className="text-xs text-gray-500">
          {getMembershipLabel(member.membership_type) || member.membership_type}
        </p>
      </div>
      {/* Days left */}
      <div className="text-right flex-shrink-0 mr-3 hidden sm:block">
        <p className={`text-sm font-semibold tabular-nums ${daysColor}`}>
          {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
        </p>
        {member.projected_value != null && (
          <p className="text-xs text-gray-500">{formatCurrency(member.projected_value)}</p>
        )}
      </div>
      {/* Action button */}
      <button
        onClick={() => onSendReminder(member)}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${btnCls}`}
      >
        <Send className="w-3 h-3" />
        <span className="hidden sm:inline">{actionLabel}</span>
      </button>
    </div>
  );
}

// Simple bar chart rendered with divs — no external chart lib needed
function BarChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-center text-sm text-gray-500 py-8">No historical data available</p>;
  }

  const maxVal = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="flex items-end gap-2 h-36 px-2">
      {data.map((d, i) => {
        const heightPct = Math.max((d.total / maxVal) * 100, 2);
        return (
          <div key={d.month || i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex items-end justify-center" style={{ height: '100px' }}>
              <div
                className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-80"
                style={{
                  height: `${heightPct}%`,
                  background: 'linear-gradient(to top, rgb(var(--gym-600-rgb)), rgb(var(--gym-400-rgb)))',
                }}
                title={formatCurrency(d.total)}
              />
            </div>
            <span className="text-[10px] text-gray-500 text-center truncate w-full leading-none">
              {formatMonth(d.month)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Forecast() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    loadForecast();
  }, []);

  async function loadForecast() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/stats/forecast');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  }

  function handleSendReminder(member) {
    toast.info(`Reminder queued for ${member.name}`);
  }

  function handleWinBack(member) {
    toast.info(`Win-back offer queued for ${member.name}`);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-10 w-64 bg-gray-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-28 bg-dark-300 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-72 bg-dark-300 rounded-2xl animate-pulse" />
        <div className="h-64 bg-dark-300 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-white font-semibold">Failed to load forecast</p>
        <p className="text-gray-400 text-sm">{error}</p>
        <button
          onClick={loadForecast}
          className="flex items-center gap-2 px-4 py-2 bg-gym-500/20 text-gym-400 border border-gym-500/30 rounded-xl text-sm hover:bg-gym-500/30 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const expiring30 = data?.expiring?.next_30 || {};
  const expiring60 = data?.expiring?.next_60 || {};
  const expiring90 = data?.expiring?.next_90 || {};
  const atRisk = data?.at_risk || {};
  const historical = data?.historical_monthly || [];
  const expiringMembers = expiring30.members || [];
  const atRiskMembers = atRisk.members || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-gym-400" />
            Revenue Forecast
          </h1>
          <p className="text-gray-400 text-sm mt-1">Based on upcoming renewals</p>
        </div>
        <button
          onClick={loadForecast}
          className="flex items-center gap-2 px-4 py-2 bg-dark-300 border border-gray-700 text-gray-400 hover:text-white rounded-xl text-sm transition-all hover:border-gray-600"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Expiring in 30 days"
          value={expiring30.count ?? 0}
          sub={`${expiring60.count ?? 0} in 60d · ${expiring90.count ?? 0} in 90d`}
          color="amber"
        />
        <StatCard
          icon={DollarSign}
          label="Projected revenue (30d)"
          value={formatCurrency(expiring30.projected_revenue ?? 0)}
          sub="Based on 70% renewal rate"
          color="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="At-risk revenue"
          value={formatCurrency(atRisk.at_risk_revenue ?? 0)}
          sub={`${atRisk.count ?? 0} at-risk members`}
          color="red"
        />
      </div>

      {/* Expiring Members Table */}
      <div className="bg-dark-300 rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Expiring Members</h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
              {expiring30.count ?? 0} in 30 days
            </span>
          </div>
        </div>

        {expiringMembers.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            No members expiring in the next 30 days
          </div>
        ) : (
          <div className="divide-y divide-gray-800/40">
            {expiringMembers.map((m, i) => (
              <MemberRow
                key={m.id || i}
                member={m}
                onSendReminder={handleSendReminder}
                actionLabel="Send Reminder"
                actionColor="gym"
              />
            ))}
          </div>
        )}
      </div>

      {/* At-Risk Members */}
      {atRiskMembers.length > 0 && (
        <div className="bg-dark-300 rounded-2xl border border-red-500/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-500/20 flex items-center gap-2 bg-red-500/5">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-white">At-Risk Members</h2>
            <span className="ml-1 text-xs text-red-400 font-medium">
              — expiring in 7 days, inactive 14+ days
            </span>
            <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400 border border-red-500/20 font-medium">
              {atRisk.count ?? 0}
            </span>
          </div>
          <div className="divide-y divide-gray-800/40">
            {atRiskMembers.map((m, i) => (
              <MemberRow
                key={m.id || i}
                member={m}
                onSendReminder={handleWinBack}
                actionLabel="Win Back"
                actionColor="red"
              />
            ))}
          </div>
        </div>
      )}

      {/* Historical Revenue Chart */}
      <div className="bg-dark-300 rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800/50 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gym-400" />
          <h2 className="text-sm font-semibold text-white">Historical Revenue</h2>
          <span className="ml-1 text-xs text-gray-500">Last 6 months</span>
        </div>
        <div className="p-5">
          <BarChart data={historical.slice(-6)} />
        </div>
      </div>

      {/* Extended Forecast Window */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: '30-Day Outlook', data: expiring30 },
          { label: '60-Day Outlook', data: expiring60 },
          { label: '90-Day Outlook', data: expiring90 },
        ].map(({ label, data: d }) => (
          <div key={label} className="bg-dark-300 rounded-2xl border border-gray-800/60 p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-white mt-1">{formatCurrency(d.projected_revenue ?? 0)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{d.count ?? 0} renewals expected</p>
            <div className="mt-3 h-1 rounded-full bg-dark-400 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((d.projected_revenue ?? 0) / Math.max(expiring90.projected_revenue ?? 1, 1)) * 100)}%`,
                  background: 'linear-gradient(90deg, rgb(var(--gym-500-rgb)), rgb(var(--gym-400-rgb)))',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-300 border border-gray-800/40">
        <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-semibold text-gray-400">Assumptions: </span>
          Projections assume a <span className="text-white font-medium">70% renewal rate</span> based on
          historical payment patterns. At-risk members are those expiring within 7 days who have not
          visited in the last 14 days.
        </p>
      </div>
    </div>
  );
}
