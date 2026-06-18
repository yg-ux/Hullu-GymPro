import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getMembershipLabel, formatDate } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  UserX,
  RefreshCw,
  Send,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Users,
  Clock,
  Gift,
  ArrowUp,
  ArrowDown,
  Minus,
  Activity,
  Bell,
  ExternalLink,
  Phone,
} from 'lucide-react';
import clsx from 'clsx';
import PageHint from '../components/PageHint';

function timeAgoLabel(days) {
  if (days === undefined || days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

// Compute days since expiry client-side from membership_end so it
// matches the date shown on the card and avoids server timezone skew.
function daysExpiredLabel(membershipEnd) {
  if (!membershipEnd) return '';
  const end = new Date(membershipEnd);
  const days = Math.max(0, Math.floor((Date.now() - end.getTime()) / 86400000));
  if (days === 0) return 'Expired today';
  if (days === 1) return 'Expired 1 day ago';
  return `Expired ${days} days ago`;
}

// ── Renewal advisory dialog ───────────────────────────────────────────────────
function RenewalDialog({ member, onSendSMS, onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-200 border border-gray-800/60 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">

          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800/60">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Call first — then follow up by text</h3>
              <p className="text-xs text-gray-500 mt-0.5">Reaching out to {member.name}</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 space-y-3">
              <p className="text-sm text-gray-200 leading-relaxed">
                Members who've lapsed have already moved on. A text message is easy to swipe away — and most of the time, it is.
              </p>
              <p className="text-sm font-semibold text-white">
                A personal phone call is far more powerful.
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">
                Two minutes on the phone — using their name, asking how they're doing, and offering something specific — brings people back at a rate no SMS can match. Use the text as a follow-up after the call, not your opening move.
              </p>
            </div>

            {member.phone && (
              <div className="flex items-center gap-3 px-4 py-3 bg-dark-300 rounded-xl border border-gray-700/50">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-white font-medium tracking-wide">{member.phone}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-800/60 flex flex-col gap-2">
            {member.phone && (
              <a
                href={`tel:${member.phone}`}
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-400 text-white rounded-xl font-semibold transition-all text-sm shadow-lg shadow-green-500/20"
              >
                <Phone className="w-4 h-4" />
                Call {member.name}
              </a>
            )}
            <button
              onClick={onSendSMS}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-dark-300 hover:bg-dark-400 text-gray-300 hover:text-white rounded-xl font-medium border border-gray-700 transition-all text-sm"
            >
              <Send className="w-4 h-4" />
              Send renewal SMS instead
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function MemberCard({ member, actionLabel, actionColor = 'gym', badge, onAction, sending }) {
  const navigate = useNavigate();
  const colorMap = {
    gym:   { btn: 'bg-gym-500/15 text-gym-400 hover:bg-gym-500/25 border-gym-500/30' },
    amber: { btn: 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border-amber-500/30' },
    green: { btn: 'bg-green-500/15 text-green-400 hover:bg-green-500/25 border-green-500/30' },
    blue:  { btn: 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border-blue-500/30' },
  };
  const btnCls = (colorMap[actionColor] || colorMap.gym).btn;
  const isSending = sending === member.id;

  return (
    <div className="bg-dark-300 rounded-xl border border-gray-800/60 p-4 flex items-start gap-3 hover:border-gray-700/60 transition-colors">
      {/* Avatar — clickable to profile */}
      <button
        onClick={() => navigate(`/customers/${member.id}`)}
        className="w-10 h-10 rounded-xl bg-gradient-to-br from-gym-500 to-gym-700 flex items-center justify-center text-white text-base font-bold flex-shrink-0 hover:scale-105 transition-transform"
        title="View profile"
      >
        {member.name?.charAt(0).toUpperCase() || '?'}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button
              onClick={() => navigate(`/customers/${member.id}`)}
              className="text-sm font-semibold text-white truncate hover:text-gym-400 transition-colors flex items-center gap-1"
            >
              {member.name}
              <ExternalLink className="w-3 h-3 opacity-50" />
            </button>
            {member.phone && (
              <p className="text-xs text-gray-500 mt-0.5">{member.phone}</p>
            )}
          </div>
          {badge}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-dark-400 rounded-lg px-2 py-0.5 border border-gray-800/40">
            <Clock className="w-3 h-3" />
            Last visit: {timeAgoLabel(member.days_since_visit)}
          </span>
          {member.membership_type && (
            <span className="inline-flex items-center text-xs text-gray-500 bg-dark-400 rounded-lg px-2 py-0.5 border border-gray-800/40">
              {getMembershipLabel(member.membership_type) || member.membership_type}
            </span>
          )}
          {member.membership_end && (
            <span className="inline-flex items-center text-xs text-gray-500 bg-dark-400 rounded-lg px-2 py-0.5 border border-gray-800/40">
              Exp: {formatDate(member.membership_end)}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <button
        onClick={() => onAction(member)}
        disabled={isSending || !member.phone}
        title={!member.phone ? 'No phone number on file' : actionLabel}
        className={clsx(
          'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
          btnCls,
          (isSending || !member.phone) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isSending
          ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : <Send className="w-3 h-3" />
        }
        <span className="hidden sm:inline">{isSending ? 'Sending…' : actionLabel}</span>
      </button>
    </div>
  );
}

function ChurnStatBox({ label, value, sub, icon: Icon, color = 'gray' }) {
  const colorMap = {
    gray:  { bg: 'bg-dark-300',        text: 'text-gray-100',  icon: 'text-gray-400',  border: 'border-gray-800/60' },
    red:   { bg: 'bg-red-500/10',      text: 'text-red-400',   icon: 'text-red-400',   border: 'border-red-500/20'  },
    green: { bg: 'bg-green-500/10',    text: 'text-green-400', icon: 'text-green-400', border: 'border-green-500/20' },
    amber: { bg: 'bg-amber-500/10',    text: 'text-amber-400', icon: 'text-amber-400', border: 'border-amber-500/20' },
  };
  const c = colorMap[color] || colorMap.gray;
  return (
    <div className={`${c.bg} rounded-2xl border ${c.border} p-5`}>
      <div className={`w-10 h-10 rounded-xl bg-dark-400/60 flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-black mt-1 ${c.text}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-4 py-2.5 text-sm font-medium rounded-xl transition-all',
        active
          ? 'bg-gym-500/20 text-gym-400 border border-gym-500/30'
          : 'text-gray-400 hover:text-white hover:bg-dark-300/60'
      )}
    >
      {children}
    </button>
  );
}

export default function Retention() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('inactive');
  const [sendingId, setSendingId] = useState(null);
  const [renewalTarget, setRenewalTarget] = useState(null);
  const toast = useToast();

  useEffect(() => {
    loadRetention();
  }, []);

  async function loadRetention() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/stats/retention');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load retention data');
    } finally {
      setLoading(false);
    }
  }

  async function sendReminder(member, type) {
    if (!member.phone) return toast.error(`${member.name} has no phone number on file`);
    setSendingId(member.id);
    try {
      await api.post(`/customers/${member.id}/send-reminder`, { type });
      toast.success(`Reminder sent to ${member.name}`);
    } catch (err) {
      toast.error(err.message || 'Failed to send SMS');
    } finally {
      setSendingId(null);
    }
  }

  const handleSendSMS      = (member) => sendReminder(member, 'inactive');
  const handleExpiringSMS  = (member) => sendReminder(member, 'expiring');
  // Win-back: open advisory dialog first; SMS only if owner confirms
  const handleOfferRenewal = (member) => setRenewalTarget(member);
  const handleRenewalSMS   = () => {
    const m = renewalTarget;
    setRenewalTarget(null);
    sendReminder(m, 'winback');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-10 w-64 bg-gray-800 rounded-lg animate-pulse" />
        <div className="flex gap-2">
          {[0, 1, 2].map(i => <div key={i} className="h-10 w-36 bg-dark-300 rounded-xl animate-pulse" />)}
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-dark-300 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-white font-semibold">Failed to load retention data</p>
        <p className="text-gray-400 text-sm">{error}</p>
        <button
          onClick={loadRetention}
          className="flex items-center gap-2 px-4 py-2 bg-gym-500/20 text-gym-400 border border-gym-500/30 rounded-xl text-sm hover:bg-gym-500/30 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const inactive     = data?.inactive      || { members: [], count: 0 };
  const winBack      = data?.win_back      || { members: [], count: 0 };
  const expiringSoon = data?.expiring_soon || { members: [], count: 0 };
  const churn        = data?.churn         || { this_month: 0, last_month: 0, total_active: 0 };

  // Sort inactive by longest inactive first
  const sortedInactive = [...(inactive.members || [])].sort(
    (a, b) => (b.days_since_visit ?? 0) - (a.days_since_visit ?? 0)
  );

  // Sort win-back by most recently expired first (server returns days_expired)
  const sortedWinBack = [...(winBack.members || [])].sort(
    (a, b) => (a.days_expired ?? 0) - (b.days_expired ?? 0)
  );

  // Sort expiring soon by soonest first
  const sortedExpiring = [...(expiringSoon.members || [])].sort(
    (a, b) => (a.days_until_expiry ?? 0) - (b.days_until_expiry ?? 0)
  );

  const churnDelta = churn.this_month - churn.last_month;
  const inactivePct = churn.total_active > 0
    ? Math.round((inactive.count / churn.total_active) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHint id="retention">
        Inactive tab shows members who haven't checked in for 14+ days — still paying but drifting. Expiring Soon lists memberships that expire within 7 days; the best time to reach out is before it lapses, not after. Win-Back lists members who have already expired — use the Offer Deal button to send a comeback message. Send Reminder fires a real SMS to the member's phone (requires SMS enabled in Settings). Click any member's name to open their profile and record a payment or view their history.
      </PageHint>
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-gym-400" />
            Retention
          </h1>
          <p className="text-gray-400 text-sm mt-1">Smart alerts for member engagement</p>
        </div>
        <button
          onClick={loadRetention}
          className="flex items-center gap-2 px-4 py-2 bg-dark-300 border border-gray-700 text-gray-400 hover:text-white rounded-xl text-sm transition-all hover:border-gray-600"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <TabButton active={activeTab === 'inactive'} onClick={() => setActiveTab('inactive')}>
          <span className="flex items-center gap-2">
            <UserX className="w-3.5 h-3.5" />
            Inactive
            {inactive.count > 0 && (
              <span className={clsx('px-1.5 py-0.5 rounded-full text-xs font-bold', activeTab === 'inactive' ? 'bg-gym-500/30 text-gym-300' : 'bg-amber-500/20 text-amber-400')}>
                {inactive.count}
              </span>
            )}
          </span>
        </TabButton>

        <TabButton active={activeTab === 'expiring'} onClick={() => setActiveTab('expiring')}>
          <span className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" />
            Expiring Soon
            {expiringSoon.count > 0 && (
              <span className={clsx('px-1.5 py-0.5 rounded-full text-xs font-bold', activeTab === 'expiring' ? 'bg-gym-500/30 text-gym-300' : 'bg-orange-500/20 text-orange-400')}>
                {expiringSoon.count}
              </span>
            )}
          </span>
        </TabButton>

        <TabButton active={activeTab === 'winback'} onClick={() => setActiveTab('winback')}>
          <span className="flex items-center gap-2">
            <Gift className="w-3.5 h-3.5" />
            Win-Back
            {winBack.count > 0 && (
              <span className={clsx('px-1.5 py-0.5 rounded-full text-xs font-bold', activeTab === 'winback' ? 'bg-gym-500/30 text-gym-300' : 'bg-red-500/20 text-red-400')}>
                {winBack.count}
              </span>
            )}
          </span>
        </TabButton>

        <TabButton active={activeTab === 'churn'} onClick={() => setActiveTab('churn')}>
          <span className="flex items-center gap-2">
            <TrendingDown className="w-3.5 h-3.5" />
            Churn Stats
          </span>
        </TabButton>
      </div>

      {/* Tab: Inactive Members */}
      {activeTab === 'inactive' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-200">
              <span className="font-bold">{inactive.count}</span> active member{inactive.count !== 1 ? 's' : ''} haven't visited in <span className="font-bold">14+ days</span>. Reach out before they lapse.
            </p>
          </div>
          {sortedInactive.length === 0 ? (
            <div className="bg-dark-300 rounded-2xl border border-gray-800/60 p-12 text-center">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">All members are active!</p>
              <p className="text-gray-600 text-sm mt-1">No members have been inactive for 14+ days.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedInactive.map((m, i) => (
                <MemberCard key={m.id || i} member={m} actionLabel="Send SMS" actionColor="amber" sending={sendingId}
                  badge={<span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium whitespace-nowrap">{timeAgoLabel(m.days_since_visit)}</span>}
                  onAction={handleSendSMS}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Expiring Soon */}
      {activeTab === 'expiring' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Bell className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <p className="text-sm text-orange-200">
              <span className="font-bold">{expiringSoon.count}</span> membership{expiringSoon.count !== 1 ? 's' : ''} expire within the next <span className="font-bold">7 days</span>. Send a reminder now so they renew on time.
            </p>
          </div>
          {sortedExpiring.length === 0 ? (
            <div className="bg-dark-300 rounded-2xl border border-gray-800/60 p-12 text-center">
              <Bell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No memberships expiring soon</p>
              <p className="text-gray-600 text-sm mt-1">No memberships expire in the next 7 days.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedExpiring.map((m, i) => (
                <MemberCard key={m.id || i} member={m} actionLabel="Send Reminder" actionColor="blue" sending={sendingId}
                  badge={
                    <span className={clsx(
                      'flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
                      m.days_until_expiry <= 1 ? 'bg-red-500/15 text-red-400 border-red-500/20' : 'bg-orange-500/15 text-orange-400 border-orange-500/20'
                    )}>
                      {m.days_until_expiry <= 0 ? 'Expires today' : `${m.days_until_expiry}d left`}
                    </span>
                  }
                  onAction={handleExpiringSMS}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Win-Back */}
      {activeTab === 'winback' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <Gift className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-200">
              <span className="font-bold">{winBack.count}</span> member{winBack.count !== 1 ? 's' : ''} expired in the last 60 days. A renewal offer could bring them back.
            </p>
          </div>
          {sortedWinBack.length === 0 ? (
            <div className="bg-dark-300 rounded-2xl border border-gray-800/60 p-12 text-center">
              <Gift className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No recent expired members</p>
              <p className="text-gray-600 text-sm mt-1">No memberships expired in the last 60 days.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedWinBack.map((m, i) => (
                <MemberCard key={m.id || i} member={m} actionLabel="Offer Renewal" actionColor="green" sending={sendingId}
                  badge={
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400 border border-red-500/20 font-medium whitespace-nowrap">
                      {daysExpiredLabel(m.membership_end)}
                    </span>
                  }
                  onAction={handleOfferRenewal}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Churn Stats */}
      {activeTab === 'churn' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ChurnStatBox
              icon={TrendingDown}
              label="Churned this month"
              value={churn.this_month}
              sub="Memberships expired"
              color={churn.this_month > churn.last_month ? 'red' : 'gray'}
            />
            <ChurnStatBox
              icon={Clock}
              label="Churned last month"
              value={churn.last_month}
              sub="Previous period"
              color="gray"
            />
            <ChurnStatBox
              icon={Users}
              label="Total active"
              value={churn.total_active}
              sub="Current active members"
              color="green"
            />
            <ChurnStatBox
              icon={UserX}
              label="Inactive rate"
              value={`${inactivePct}%`}
              sub={`${inactive.count} members inactive 14d+`}
              color={inactivePct > 20 ? 'red' : inactivePct > 10 ? 'amber' : 'green'}
            />
          </div>

          {/* Churn Trend */}
          <div className="bg-dark-300 rounded-2xl border border-gray-800/60 p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-gym-400" />
              Churn Trend
            </h3>
            <div className="flex items-center justify-around gap-4">
              {/* Last month */}
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Last Month</p>
                <p className="text-4xl font-black text-gray-300 tabular-nums">{churn.last_month}</p>
                <p className="text-xs text-gray-600 mt-1">expired</p>
              </div>

              {/* Arrow + delta */}
              <div className="flex flex-col items-center gap-1">
                {churnDelta === 0 ? (
                  <Minus className="w-6 h-6 text-gray-500" />
                ) : churnDelta > 0 ? (
                  <ArrowUp className="w-6 h-6 text-red-400" />
                ) : (
                  <ArrowDown className="w-6 h-6 text-green-400" />
                )}
                <span
                  className={clsx(
                    'text-sm font-bold',
                    churnDelta === 0 ? 'text-gray-500' : churnDelta > 0 ? 'text-red-400' : 'text-green-400'
                  )}
                >
                  {churnDelta === 0 ? 'No change' : `${churnDelta > 0 ? '+' : ''}${churnDelta}`}
                </span>
                {churnDelta !== 0 && churn.last_month > 0 && (
                  <span className="text-xs text-gray-600">
                    ({Math.round(Math.abs(churnDelta) / churn.last_month * 100)}%)
                  </span>
                )}
              </div>

              {/* This month */}
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">This Month</p>
                <p className={clsx(
                  'text-4xl font-black tabular-nums',
                  churnDelta > 0 ? 'text-red-400' : churnDelta < 0 ? 'text-green-400' : 'text-gray-300'
                )}>
                  {churn.this_month}
                </p>
                <p className="text-xs text-gray-600 mt-1">expired</p>
              </div>
            </div>

            {/* Interpretation */}
            <div className={clsx(
              'mt-6 flex items-start gap-2 p-3 rounded-xl text-sm',
              churnDelta > 0
                ? 'bg-red-500/10 border border-red-500/20'
                : churnDelta < 0
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-dark-400/60 border border-gray-800/40'
            )}>
              {churnDelta > 0 ? (
                <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              ) : churnDelta < 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Activity className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              )}
              <p className={clsx(
                'text-xs',
                churnDelta > 0 ? 'text-red-300' : churnDelta < 0 ? 'text-green-300' : 'text-gray-400'
              )}>
                {churnDelta > 0
                  ? `Churn increased by ${churnDelta} compared to last month. Consider proactive outreach to at-risk members.`
                  : churnDelta < 0
                    ? `Churn decreased by ${Math.abs(churnDelta)} compared to last month. Retention efforts are paying off!`
                    : `Churn is stable compared to last month.`}
              </p>
            </div>
          </div>

          {/* At a Glance */}
          <div className="bg-dark-300 rounded-2xl border border-gray-800/60 p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gym-400" />
              At a Glance
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: 'Active members',
                  value: churn.total_active,
                  bar: 100,
                  color: 'green',
                },
                {
                  label: `Inactive 14+ days (${inactivePct}%)`,
                  value: inactive.count,
                  bar: inactivePct,
                  color: inactivePct > 20 ? 'red' : 'amber',
                },
                {
                  label: 'Expired last 60 days',
                  value: winBack.count,
                  bar: churn.total_active > 0 ? Math.round((winBack.count / churn.total_active) * 100) : 0,
                  color: 'red',
                },
              ].map(({ label, value, bar, color }) => {
                const barColor = color === 'green'
                  ? 'from-green-600 to-green-400'
                  : color === 'red'
                    ? 'from-red-600 to-red-400'
                    : 'from-amber-600 to-amber-400';
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-white font-semibold">{value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-dark-400 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                        style={{ width: `${Math.min(100, bar)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Renewal advisory dialog */}
      {renewalTarget && (
        <RenewalDialog
          member={renewalTarget}
          onSendSMS={handleRenewalSMS}
          onClose={() => setRenewalTarget(null)}
        />
      )}
    </div>
  );
}
