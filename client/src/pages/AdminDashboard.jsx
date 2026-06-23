import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, DollarSign, TrendingUp, AlertCircle,
  Check, X, Clock, LogOut, RefreshCw, ChevronRight,
  CheckCircle, XCircle, Phone, Mail, Calendar, Hash,
  Search, Eye, Shield, Trash2, MessageSquare, Play, Bell,
  ChevronUp, ChevronDown, Download, Crown, Megaphone,
  Activity, BarChart3, Zap, CalendarClock, Edit3, Save,
  Wallet, Receipt, Plus
} from 'lucide-react';
import clsx from 'clsx';

const ADMIN_API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

function adminFetch(path, options = {}) {
  const token = localStorage.getItem('adminToken');
  return fetch(`${ADMIN_API}/admin${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  }).then(async res => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  });
}

const DECLINE_REASONS = [
  'Transaction ID not found in records',
  'Transaction amount does not match',
  'Transaction ID already used',
  'Payment not received',
  'Invalid or expired transaction',
  'Wrong payment method',
  'Duplicate request',
  'Other',
];

const PLAN_LIMITS = { free: 10, starter: 100, pro: -1, enterprise: -1 };
const PLAN_COLORS = {
  free:       'bg-gray-500/20 text-gray-400',
  starter:    'bg-blue-500/20 text-blue-400',
  pro:        'bg-purple-500/20 text-purple-400',
  enterprise: 'bg-amber-500/20 text-amber-400',
};
const STATUS_COLORS = {
  active:        'bg-green-500/20 text-green-400',
  trial:         'bg-yellow-500/20 text-yellow-400',
  expired:       'bg-red-500/20 text-red-400',
  trial_expired: 'bg-red-500/20 text-red-400',
  pending:       'bg-yellow-500/20 text-yellow-400',
  approved:      'bg-green-500/20 text-green-400',
  declined:      'bg-red-500/20 text-red-400',
};

// ── Donut Chart helper ────────────────────────────────────────────────────────
function DonutSegment({ cx, cy, r, startAngle, endAngle, color, thickness }) {
  function toXY(deg) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }
  const span = endAngle - startAngle;
  if (span >= 359.99) return <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={thickness} />;
  const [x1, y1] = toXY(startAngle);
  const [x2, y2] = toXY(endAngle);
  const large = span > 180 ? 1 : 0;
  return <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="butt" />;
}
function DonutChart({ segments, size = 130, thickness = 22 }) {
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);
  if (!total) return null;
  let angle = 0;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111827" strokeWidth={thickness} />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const span = (seg.value / total) * 360;
        const el = <DonutSegment key={i} cx={cx} cy={cy} r={r} startAngle={angle} endAngle={angle + span} color={seg.color} thickness={thickness} />;
        angle += span;
        return el;
      })}
    </svg>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]         = useState(null);
  const [gyms, setGyms]           = useState([]);
  const [requests, setRequests]   = useState([]);
  const [revenue, setRevenue]     = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [processing, setProcessing] = useState(null);

  // Gym search & sort
  const [gymSearch, setGymSearch]   = useState('');
  const [sortField, setSortField]   = useState('created_at');
  const [sortDir, setSortDir]       = useState('desc');

  // Request filter & search
  const [requestFilter, setRequestFilter] = useState('pending');
  const [requestSearch, setRequestSearch] = useState('');

  // Modals
  const [reviewModal, setReviewModal]     = useState(null);
  const [adminNotes, setAdminNotes]       = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [gymDetail, setGymDetail]         = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [setPlanModal, setSetPlanModal]   = useState(null); // gym
  const [extendModal, setExtendModal]     = useState(null); // gym
  const [broadcastModal, setBroadcastModal] = useState(false);

  // Plan override form
  const [planForm, setPlanForm] = useState({ plan: 'starter', months: 1, notes: '' });
  const [planSaving, setPlanSaving] = useState(false);

  // Extend form
  const [extendDate, setExtendDate] = useState('');
  const [extendNotes, setExtendNotes] = useState('');
  const [extendSaving, setExtendSaving] = useState(false);

  // Broadcast form
  const [broadcastMsg, setBroadcastMsg]   = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [broadcastSaving, setBroadcastSaving] = useState(false);
  const [currentBroadcast, setCurrentBroadcast] = useState(null);

  // SMS dev tool
  const [cronSecret, setCronSecret] = useState('');
  const [smsTest, setSmsTest] = useState({ loading: false, result: null, error: null });

  // Financials
  const [financials, setFinancials]         = useState(null);
  const [finHistory, setFinHistory]         = useState([]);
  const [expenses, setExpenses]             = useState([]);
  const [planPrices, setPlanPrices]         = useState({ starter: 1499, pro: 3499 });
  const [finLoading, setFinLoading]         = useState(false);
  const [finError, setFinError]             = useState(null);
  const [expModal, setExpModal]             = useState(null); // null | 'add' | expense object
  const [expForm, setExpForm]               = useState({ name: '', category: 'infrastructure', amount: '', frequency: 'monthly', notes: '' });
  const [expSaving, setExpSaving]           = useState(false);
  const [priceEdit, setPriceEdit]           = useState(null); // null | 'starter' | 'pro'
  const [priceValue, setPriceValue]         = useState('');
  const [smsRateEdit, setSmsRateEdit]       = useState(false);
  const [smsRateValue, setSmsRateValue]     = useState('');
  const [snapshotting, setSnapshotting]     = useState(false);
  const [finView, setFinView]               = useState('monthly'); // 'monthly' | 'annual'
  const [smsHistory, setSmsHistory]         = useState([]);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/admin-login'); return; }
    adminFetch('/verify')
      .then(() => loadAll())
      .catch(() => { localStorage.removeItem('adminToken'); navigate('/admin-login'); });
  }, []);

  const loadAll = async () => {
    setLoading(true); setLoadError('');
    try {
      const [s, g, r, rev, bc] = await Promise.all([
        adminFetch('/stats'),
        adminFetch('/gyms'),
        adminFetch('/subscription-requests'),
        adminFetch('/revenue-analytics'),
        adminFetch('/broadcast'),
      ]);
      setStats(s);
      setGyms(Array.isArray(g) ? g : []);
      setRequests(Array.isArray(r) ? r : []);
      setRevenue(rev);
      setCurrentBroadcast(bc);
    } catch (e) {
      setLoadError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLog = async () => {
    try { setActivityLog(await adminFetch('/activity-log')); } catch {}
  };
  useEffect(() => { if (activeTab === 'activity') loadActivityLog(); }, [activeTab]);

  const loadFinancials = async () => {
    setFinLoading(true);
    setFinError(null);
    try {
      const [summary, history, expList, prices, smsHist] = await Promise.all([
        adminFetch('/financials/summary'),
        adminFetch('/financials/history'),
        adminFetch('/financials/expenses'),
        adminFetch('/financials/plan-prices'),
        adminFetch('/financials/sms-history').catch(() => []),
      ]);
      setFinancials(summary);
      setFinHistory(history);
      setExpenses(expList);
      setPlanPrices(prices.prices);
      setSmsHistory(Array.isArray(smsHist) ? smsHist : []);
    } catch (e) {
      console.error('Financials load error', e);
      setFinError(e.message || 'Unknown error');
    }
    finally { setFinLoading(false); }
  };
  useEffect(() => { if (activeTab === 'financials') loadFinancials(); }, [activeTab]);

  // ── Gym sort + filter ───────────────────────────────────────────────────────
  const sortedGyms = useMemo(() => {
    const filtered = gyms.filter(g =>
      !gymSearch ||
      g.name?.toLowerCase().includes(gymSearch.toLowerCase()) ||
      g.email?.toLowerCase().includes(gymSearch.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av == null) av = '';
      if (bv == null) bv = '';
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [gyms, gymSearch, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-gym-400" /> : <ChevronDown className="w-3 h-3 text-gym-400" />;
  };

  // ── Request filter ──────────────────────────────────────────────────────────
  const filteredRequests = useMemo(() =>
    requests.filter(r =>
      (requestFilter === 'all' || r.status === requestFilter) &&
      (!requestSearch || r.gym_name?.toLowerCase().includes(requestSearch.toLowerCase()) ||
       r.transaction_id?.toLowerCase().includes(requestSearch.toLowerCase()))
    ), [requests, requestFilter, requestSearch]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleReview = async () => {
    if (!reviewModal) return;
    const { request, action } = reviewModal;
    let finalNote = '';
    if (action === 'decline') {
      if (!declineReason) return;
      finalNote = declineReason === 'Other'
        ? (adminNotes.trim() || 'Other')
        : declineReason + (adminNotes.trim() ? ` — ${adminNotes.trim()}` : '');
    }
    setProcessing(request.id);
    try {
      await adminFetch(`/${action === 'approve' ? 'approve' : 'decline'}-request/${request.id}`, {
        method: 'POST', body: JSON.stringify({ admin_notes: finalNote || null }),
      });
      setReviewModal(null);
      loadAll();
    } catch (e) { alert(e.message); }
    finally { setProcessing(null); }
  };

  const handleDeleteGym = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await adminFetch(`/gyms/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm(null); loadAll();
    } catch (e) { alert(e.message); }
    finally { setDeleting(false); }
  };

  const handleSetPlan = async () => {
    setPlanSaving(true);
    try {
      await adminFetch(`/gyms/${setPlanModal.id}/set-plan`, {
        method: 'POST', body: JSON.stringify(planForm),
      });
      setSetPlanModal(null); loadAll();
    } catch (e) { alert(e.message); }
    finally { setPlanSaving(false); }
  };

  const handleExtend = async () => {
    setExtendSaving(true);
    try {
      await adminFetch(`/gyms/${extendModal.id}/extend`, {
        method: 'POST', body: JSON.stringify({ end_date: extendDate, notes: extendNotes }),
      });
      setExtendModal(null); loadAll();
    } catch (e) { alert(e.message); }
    finally { setExtendSaving(false); }
  };

  const handleBroadcast = async () => {
    setBroadcastSaving(true);
    try {
      await adminFetch('/broadcast', {
        method: 'POST', body: JSON.stringify({ message: broadcastMsg, type: broadcastType }),
      });
      setBroadcastModal(false);
      setBroadcastMsg('');
      loadAll();
    } catch (e) { alert(e.message); }
    finally { setBroadcastSaving(false); }
  };

  const clearBroadcast = async () => {
    try {
      await adminFetch('/broadcast', { method: 'POST', body: JSON.stringify({ message: '' }) });
      setCurrentBroadcast(null);
    } catch {}
  };

  const handleSmsTest = async () => {
    if (!cronSecret) return;
    setSmsTest({ loading: true, result: null, error: null });
    try {
      const res = await fetch(`${ADMIN_API}/cron/sms-reminders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: cronSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSmsTest({ loading: false, result: data, error: null });
    } catch (e) {
      setSmsTest({ loading: false, result: null, error: e.message });
    }
  };

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const exportGymsCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Plan', 'Status', 'Members', 'Revenue (ETB)', 'Registered', 'Expires'];
    const rows = sortedGyms.map(g => [
      g.name, g.email, g.phone || '',
      g.subscription_plan, g.subscription_status,
      g.member_count || 0, g.total_revenue || 0,
      g.created_at ? new Date(g.created_at).toLocaleDateString() : '',
      g.subscription_end ? new Date(g.subscription_end).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `hullu-gyms-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const handleLogout = () => { localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser'); navigate('/admin-login'); };

  if (loading) return (
    <div className="min-h-screen bg-dark-100 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-gym-500 border-t-transparent animate-spin" />
    </div>
  );

  const tabs = [
    { key: 'overview',    label: 'Overview',    icon: TrendingUp },
    { key: 'gyms',        label: `Gyms (${gyms.length})`, icon: Building2 },
    { key: 'requests',    label: 'Requests',    icon: Clock, badge: pendingCount },
    { key: 'revenue',     label: 'Revenue',     icon: BarChart3 },
    { key: 'activity',    label: 'Activity',    icon: Activity },
    { key: 'financials',  label: 'Financials',  icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-dark-100">

      {/* Header */}
      <header className="bg-dark-200 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Hullu Gyms</h1>
              <p className="text-xs text-gray-400">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setBroadcastModal(true)} title="Broadcast" className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-dark-300 rounded-lg transition-colors">
              <Megaphone className="w-5 h-5" />
            </button>
            <button onClick={loadAll} className="p-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-lg transition-colors" title="Refresh">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Active broadcast banner */}
        {currentBroadcast && (
          <div className={clsx('flex items-center gap-3 p-4 rounded-xl border text-sm',
            currentBroadcast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
            currentBroadcast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-300' :
            'bg-blue-500/10 border-blue-500/30 text-blue-300')}>
            <Megaphone className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1"><span className="font-semibold">Active broadcast: </span>{currentBroadcast.message}</span>
            <button onClick={clearBroadcast} className="text-gray-500 hover:text-white ml-2"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-dark-200 rounded-xl p-1 w-fit overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                activeTab === tab.key ? 'bg-gym-600 text-white' : 'text-gray-400 hover:text-white hover:bg-dark-300')}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge > 0 && <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-xs rounded-full font-bold">{tab.badge}</span>}
            </button>
          ))}
        </div>

        {/* Error */}
        {loadError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1"><p className="font-medium">Failed to load data</p><p className="text-sm opacity-80">{loadError}</p></div>
            <button onClick={loadAll} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm">Retry</button>
          </div>
        )}

        {/* ══ OVERVIEW ══════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Gyms"     value={stats?.total_gyms || 0}       icon={Building2}   color="blue" />
              <StatCard title="Active"         value={stats?.active_gyms || 0}      icon={CheckCircle} color="green" />
              <StatCard title="On Trial"       value={stats?.trial_gyms || 0}       icon={Clock}       color="yellow" />
              <StatCard title="Total Revenue"  value={`ETB ${(stats?.total_revenue || 0).toLocaleString()}`} icon={DollarSign} color="purple" />
            </div>

            {/* Demo Session Analytics */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Demo Sessions</h3>
                    <p className="text-xs text-gray-500">People who clicked "Try Demo" on your site</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-purple-400">{stats?.demo?.total || 0}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-dark-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-white">{stats?.demo?.today || 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Today</p>
                </div>
                <div className="bg-dark-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-white">{stats?.demo?.this_week || 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">This Week</p>
                </div>
                <div className="bg-dark-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-white">{stats?.demo?.this_month || 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">This Month</p>
                </div>
              </div>
              {/* Sparkline — last 30 days */}
              {(stats?.demo?.daily?.length || 0) > 0 && (() => {
                const daily = stats.demo.daily;
                const max = Math.max(...daily.map(d => d.count), 1);
                return (
                  <div className="flex items-end gap-0.5 h-10">
                    {daily.map((d, i) => (
                      <div key={i} title={`${d.date}: ${d.count}`}
                        className="flex-1 bg-purple-500/60 hover:bg-purple-400 rounded-sm transition-colors cursor-default"
                        style={{ height: `${Math.max(10, (d.count / max) * 100)}%` }}
                      />
                    ))}
                  </div>
                );
              })()}
              {(stats?.demo?.daily?.length || 0) === 0 && (
                <p className="text-xs text-gray-600 text-center py-2">No demo sessions in the last 30 days</p>
              )}
            </div>

            {/* Alerts row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pendingCount > 0 && (
                <div className="card p-5 border-yellow-500/30 bg-yellow-500/5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{pendingCount} Pending Request{pendingCount > 1 ? 's' : ''}</p>
                    <p className="text-gray-400 text-sm">Awaiting review</p>
                  </div>
                  <button onClick={() => setActiveTab('requests')} className="btn-primary flex items-center gap-2 whitespace-nowrap text-sm">
                    Review <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              {(stats?.expiring_soon || 0) > 0 && (
                <div className="card p-5 border-orange-500/30 bg-orange-500/5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <CalendarClock className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{stats.expiring_soon} Expiring in 14 days</p>
                    <p className="text-gray-400 text-sm">Subscriptions need renewal</p>
                  </div>
                  <button onClick={() => setActiveTab('revenue')} className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                    View <ChevronRight className="w-4 h-4 inline" />
                  </button>
                </div>
              )}
            </div>

            {/* Plan distribution */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Plan Distribution</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {['free', 'starter', 'pro', 'enterprise'].map(plan => {
                  const count = gyms.filter(g => g.subscription_plan === plan).length;
                  return (
                    <div key={plan} className={clsx('p-4 rounded-xl text-center', PLAN_COLORS[plan])}>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm capitalize">{plan}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Developer Tools */}
            <div className="card p-6 border border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Developer Tools</h2>
                  <p className="text-xs text-gray-500">Test backend services manually</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SMS trigger — inline secret input (no browser prompt) */}
                <div className="p-4 bg-dark-200/60 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">SMS Reminders Cron</span>
                  </div>
                  <p className="text-xs text-gray-400">Triggers the daily SMS reminder check for expiring memberships.</p>
                  <input
                    type="password"
                    placeholder="Enter CRON_SECRET…"
                    value={cronSecret}
                    onChange={e => setCronSecret(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-dark-300 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                  <button onClick={handleSmsTest} disabled={smsTest.loading || !cronSecret}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    {smsTest.loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running…</> : <><Play className="w-4 h-4" /> Trigger Now</>}
                  </button>
                  {smsTest.result && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-xs text-green-400 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {smsTest.result.message}</p>
                    </div>
                  )}
                  {smsTest.error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-red-400 font-medium flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {smsTest.error}</p>
                    </div>
                  )}
                </div>
                {/* Auto-schedule instructions */}
                <div className="p-4 bg-dark-200/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-white">Auto Schedule (cron.job)</span>
                  </div>
                  <p className="text-xs text-gray-400">Set this up once so reminders run every day at 8 AM:</p>
                  <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Go to <span className="text-white">cron-job.org</span> (free)</li>
                    <li>URL: <code className="text-blue-400 bg-dark-300 px-1 rounded">POST /api/cron/sms-reminders</code></li>
                    <li>Schedule: <code className="text-blue-400 bg-dark-300 px-1 rounded">0 8 * * *</code></li>
                    <li>Body: <code className="text-blue-400 bg-dark-300 px-1 rounded">{`{"secret":"CRON_SECRET"}`}</code></li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Recent registrations — newest first */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Registrations</h2>
              <div className="space-y-3">
                {[...gyms].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(gym => (
                  <div key={gym.id} className="flex items-center justify-between p-4 bg-dark-200/60 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                        {gym.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{gym.name}</p>
                        <p className="text-xs text-gray-400">{gym.email} · {gym.created_at ? new Date(gym.created_at).toLocaleDateString() : ''}</p>
                      </div>
                    </div>
                    <PlanBadge plan={gym.subscription_plan} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ GYMS ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'gyms' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search by name or email…" value={gymSearch}
                  onChange={e => setGymSearch(e.target.value)} className="input-field pl-10" />
              </div>
              <button onClick={exportGymsCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-dark-200 hover:bg-dark-300 text-gray-300 rounded-xl text-sm font-medium transition-colors border border-gray-700">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>

            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800 text-xs uppercase tracking-wider">
                    <th className="p-4">Gym</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4 cursor-pointer hover:text-white select-none" onClick={() => toggleSort('subscription_plan')}>
                      <span className="flex items-center gap-1">Plan <SortIcon field="subscription_plan" /></span>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:text-white select-none" onClick={() => toggleSort('member_count')}>
                      <span className="flex items-center justify-center gap-1">Members <SortIcon field="member_count" /></span>
                    </th>
                    <th className="p-4 text-right cursor-pointer hover:text-white select-none" onClick={() => toggleSort('total_revenue')}>
                      <span className="flex items-center justify-end gap-1">Revenue <SortIcon field="total_revenue" /></span>
                    </th>
                    <th className="p-4">Status</th>
                    <th className="p-4 cursor-pointer hover:text-white select-none" onClick={() => toggleSort('subscription_end')}>
                      <span className="flex items-center gap-1">Expires <SortIcon field="subscription_end" /></span>
                    </th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {sortedGyms.map(gym => (
                    <tr key={gym.id} className="hover:bg-dark-200/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                            {gym.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{gym.name}</p>
                            <p className="text-xs text-gray-500">{gym.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-300">{gym.email}</p>
                        <p className="text-xs text-gray-500">{gym.phone || '—'}</p>
                      </td>
                      <td className="p-4"><PlanBadge plan={gym.subscription_plan} /></td>
                      <td className="p-4 text-center text-white">{gym.member_count || 0}</td>
                      <td className="p-4 text-right text-green-400 font-medium">ETB {(gym.total_revenue || 0).toLocaleString()}</td>
                      <td className="p-4"><StatusBadge status={gym.subscription_status} /></td>
                      <td className="p-4 text-gray-400 text-xs">
                        {gym.subscription_end ? new Date(gym.subscription_end).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setGymDetail(gym)} className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-300 rounded-lg transition-colors" title="View details"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => { setSetPlanModal(gym); setPlanForm({ plan: gym.subscription_plan || 'starter', months: 1, notes: '' }); }} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Change plan"><Crown className="w-4 h-4" /></button>
                          <button onClick={() => { setExtendModal(gym); setExtendDate(gym.subscription_end?.slice(0,10) || ''); setExtendNotes(''); }} className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors" title="Extend subscription"><CalendarClock className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteConfirm(gym)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedGyms.length === 0 && (
                    <tr><td colSpan={8} className="p-12 text-center text-gray-500">No gyms found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ REQUESTS ══════════════════════════════════════════════════════════ */}
        {activeTab === 'requests' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex gap-2">
                {['pending', 'approved', 'declined', 'all'].map(f => (
                  <button key={f} onClick={() => setRequestFilter(f)}
                    className={clsx('px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
                      requestFilter === f ? 'bg-gym-600 text-white' : 'bg-dark-200 text-gray-400 hover:text-white')}>
                    {f} {f !== 'all' && `(${requests.filter(r => r.status === f).length})`}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search gym or transaction ID…" value={requestSearch}
                  onChange={e => setRequestSearch(e.target.value)}
                  className="input-field pl-9 py-2 text-sm" />
              </div>
            </div>

            <div className="space-y-4">
              {filteredRequests.length === 0 ? (
                <div className="card p-12 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No {requestFilter === 'all' ? '' : requestFilter} requests</p>
                </div>
              ) : filteredRequests.map(req => (
                <div key={req.id} className="card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                        {req.gym_name?.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-white text-lg">{req.gym_name}</p>
                        <p className="text-sm text-gray-400 flex items-center gap-1 flex-wrap">
                          <Mail className="w-3 h-3" /> {req.gym_email}
                          {req.gym_phone && <><Phone className="w-3 h-3 ml-2" /> {req.gym_phone}</>}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <span className="text-sm text-gray-300">ETB {(req.amount_paid || 0).toLocaleString()}</span>
                          <span className="text-gray-500 text-sm capitalize">{req.payment_method?.replace('_', ' ')}</span>
                          <span className="flex items-center gap-1 text-sm font-mono text-gym-400 bg-gym-500/10 px-2 py-0.5 rounded">
                            <Hash className="w-3 h-3" />{req.transaction_id}
                          </span>
                          <span className="text-sm text-gray-400">{req.duration_months || 1} month{(req.duration_months || 1) > 1 ? 's' : ''}</span>
                        </div>
                        {/* Payment proof image */}
                        {req.payment_proof && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Payment Proof:</p>
                            <img src={req.payment_proof} alt="Payment proof"
                              className="max-h-40 max-w-xs rounded-lg border border-gray-700 cursor-pointer hover:opacity-90"
                              onClick={() => window.open(req.payment_proof, '_blank')} />
                          </div>
                        )}
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Submitted {new Date(req.created_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {req.admin_notes && <p className="text-sm text-gray-400 italic mt-1">Note: {req.admin_notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <PlanBadge plan={req.requested_plan} large />
                      <StatusBadge status={req.status} />
                      {req.status === 'pending' && (
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => openReview(req, 'approve')} disabled={processing === req.id}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                            <Check className="w-4 h-4" /> Approve
                          </button>
                          <button onClick={() => openReview(req, 'decline')} disabled={processing === req.id}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                            <X className="w-4 h-4" /> Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ REVENUE ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'revenue' && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Revenue"       value={`ETB ${(stats?.total_revenue || 0).toLocaleString()}`}      icon={DollarSign}  color="purple" />
              <StatCard title="This Month"          value={`ETB ${(stats?.this_month_revenue || 0).toLocaleString()}`} icon={TrendingUp}   color="green" />
              <StatCard title="Paid Gyms"           value={gyms.filter(g => g.subscription_plan !== 'free').length}    icon={Crown}        color="blue" />
              <StatCard title="Expiring (14 days)"  value={revenue?.expiring_soon?.length || 0}                        icon={CalendarClock} color="yellow" />
            </div>

            {/* Revenue by plan */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Revenue by Plan</h2>
              {revenue?.by_plan?.length > 0 ? (
                <div className="space-y-3">
                  {revenue.by_plan.map(p => {
                    const total = revenue.by_plan.reduce((s, x) => s + parseFloat(x.revenue), 0) || 1;
                    const pct = (parseFloat(p.revenue) / total) * 100;
                    return (
                      <div key={p.plan} className="flex items-center gap-4">
                        <div className="w-20 text-right">
                          <PlanBadge plan={p.plan} />
                        </div>
                        <div className="flex-1 h-8 bg-dark-200 rounded-lg overflow-hidden">
                          <div className={clsx('h-full rounded-lg flex items-center justify-end pr-3 transition-all',
                            p.plan === 'pro' ? 'bg-gradient-to-r from-purple-600 to-purple-400' : 'bg-gradient-to-r from-blue-600 to-blue-400')}
                            style={{ width: `${Math.max(pct, 2)}%` }}>
                            {pct > 15 && <span className="text-xs font-bold text-white">{p.count} gyms</span>}
                          </div>
                        </div>
                        <div className="w-28 text-right text-sm text-green-400 font-medium">ETB {parseFloat(p.revenue).toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-gray-500 text-sm">No revenue data yet</p>}
            </div>

            {/* Monthly chart */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Monthly Revenue (Last 12 Months)</h2>
              {revenue?.monthly?.length > 0 ? (
                <div className="space-y-2">
                  {(() => {
                    const max = Math.max(...revenue.monthly.map(m => parseFloat(m.revenue)), 1);
                    return revenue.monthly.map(m => {
                      const pct = (parseFloat(m.revenue) / max) * 100;
                      return (
                        <div key={m.month} className="flex items-center gap-3">
                          <div className="w-16 text-xs text-gray-400 text-right flex-shrink-0">{m.month}</div>
                          <div className="flex-1 h-7 bg-dark-200 rounded-lg overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-gym-600 to-gym-400 rounded-lg flex items-center justify-end pr-2 transition-all"
                              style={{ width: `${Math.max(pct, 1)}%` }}>
                              {pct > 20 && <span className="text-[10px] font-bold text-white">{m.approvals} gyms</span>}
                            </div>
                          </div>
                          <div className="w-28 text-right text-sm text-green-400 font-medium flex-shrink-0">ETB {parseFloat(m.revenue).toLocaleString()}</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : <p className="text-gray-500 text-sm">No monthly data yet</p>}
            </div>

            {/* Expiring soon */}
            {revenue?.expiring_soon?.length > 0 && (
              <div className="card p-6 border border-orange-500/20">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-orange-400" /> Expiring in 14 Days
                </h2>
                <div className="space-y-3">
                  {revenue.expiring_soon.map(gym => (
                    <div key={gym.id} className="flex items-center justify-between p-3 bg-dark-200/60 rounded-xl">
                      <div>
                        <p className="font-medium text-white">{gym.name}</p>
                        <p className="text-xs text-gray-400">{gym.email} · {gym.phone || '—'}</p>
                      </div>
                      <div className="text-right">
                        <PlanBadge plan={gym.subscription_plan} />
                        <p className="text-xs text-orange-400 mt-1">Expires {new Date(gym.subscription_end).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ FINANCIALS ════════════════════════════════════════════════════════ */}
        {activeTab === 'financials' && (
          <div className="space-y-6 animate-fade-in">
            {finLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-dark-200 rounded-2xl animate-pulse" />)}
              </div>
            ) : financials ? (
              <>
                {/* View toggle + Snapshot button */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex bg-dark-200 rounded-xl p-1 border border-gray-800">
                    {['monthly','annual'].map(v => (
                      <button key={v} onClick={() => setFinView(v)}
                        className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
                          finView === v ? 'bg-gym-600 text-white' : 'text-gray-400 hover:text-white')}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      setSnapshotting(true);
                      try { await adminFetch('/financials/snapshot', { method: 'POST' }); await loadFinancials(); }
                      catch (e) { alert(e.message); }
                      finally { setSnapshotting(false); }
                    }}
                    disabled={snapshotting}
                    className="flex items-center gap-2 px-4 py-2 bg-dark-200 border border-gray-700 hover:border-gray-500 text-gray-300 text-sm rounded-xl transition-all">
                    {snapshotting ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                    Lock this month
                  </button>
                </div>

                {/* P&L Summary cards */}
                {(() => {
                  const mul = finView === 'annual' ? 12 : 1;
                  const mrr = (financials.mrr || 0) * mul;
                  const expenses_total = (financials.total_expenses || 0) * mul;
                  const profit = mrr - expenses_total;
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="card p-5 border border-green-500/20 bg-green-500/5">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-xs text-gray-500">{finView === 'annual' ? 'Annual' : 'Monthly'} Revenue (MRR)</p>
                          {(() => {
                            const prevSnap = finHistory.length >= 2 ? finHistory[finHistory.length - 2] : null;
                            if (!prevSnap || !prevSnap.mrr) return null;
                            const pct = Math.round(((financials.mrr - prevSnap.mrr) / prevSnap.mrr) * 100);
                            return (
                              <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded-full', pct >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                                {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}% vs last
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-3xl font-bold text-green-400">ETB {mrr.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {financials.starter_count} Starter × ETB {planPrices.starter?.toLocaleString()} +{' '}
                          {financials.pro_count} Pro × ETB {planPrices.pro?.toLocaleString()}
                        </p>
                        {finView === 'monthly' && (
                          <p className="text-xs text-green-400/60 mt-1">≈ ETB {((financials.mrr || 0) * 12).toLocaleString()} projected annually</p>
                        )}
                      </div>
                      <div className="card p-5 border border-red-500/20 bg-red-500/5">
                        <p className="text-xs text-gray-500 mb-1">{finView === 'annual' ? 'Annual' : 'Monthly'} Expenses</p>
                        <p className="text-3xl font-bold text-red-400">ETB {Math.round(expenses_total).toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Manual: ETB {Math.round((financials.monthly_expenses + financials.yearly_expenses_monthly) * mul).toLocaleString()} ·{' '}
                          SMS: ETB {Math.round((financials.auto_sms_cost || 0) * mul).toLocaleString()}
                        </p>
                      </div>
                      <div className={clsx('card p-5', profit >= 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5')}>
                        <p className="text-xs text-gray-500 mb-1">Net Profit</p>
                        <p className={clsx('text-3xl font-bold', profit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          ETB {Math.round(profit).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Margin: {mrr > 0 ? Math.round((profit / mrr) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* SaaS Metrics Row */}
                {(() => {
                  const payingGyms = (financials.starter_count || 0) + (financials.pro_count || 0);
                  const arpu = payingGyms > 0 ? Math.round(financials.mrr / payingGyms) : 0;
                  const gymsNeeded = arpu > 0 ? Math.ceil(financials.total_expenses / arpu) : '—';
                  const gymsToBreakeven = typeof gymsNeeded === 'number' ? Math.max(0, gymsNeeded - payingGyms) : '—';
                  const costPerGym = payingGyms > 0 ? Math.round(financials.total_expenses / payingGyms) : 0;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'ARPU', value: `ETB ${arpu.toLocaleString()}`, sub: 'avg revenue / gym / mo', color: 'text-blue-400' },
                        { label: 'Break-even at', value: `${gymsToBreakeven === 0 ? '✓ Profitable' : `${gymsToBreakeven} more gyms`}`, sub: `${typeof gymsNeeded === 'number' ? gymsNeeded : '—'} paying gyms total needed`, color: gymsToBreakeven === 0 ? 'text-emerald-400' : 'text-amber-400' },
                        { label: 'Free gyms', value: financials.free_count || 0, sub: 'conversion opportunity', color: 'text-purple-400' },
                        { label: 'Cost per gym', value: `ETB ${costPerGym.toLocaleString()}`, sub: 'expenses ÷ paying gyms', color: 'text-red-400' },
                      ].map(m => (
                        <div key={m.label} className="card p-4 border border-gray-800/50">
                          <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                          <p className={clsx('text-lg font-bold', m.color)}>{String(m.value)}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{m.sub}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Expense breakdown by category */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-white">Expense Breakdown</h3>
                    <button onClick={() => { setExpForm({ name: '', category: 'infrastructure', amount: '', frequency: 'monthly', notes: '' }); setExpModal('add'); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gym-500/20 hover:bg-gym-500/30 text-gym-400 text-sm rounded-lg transition-all">
                      <Plus className="w-4 h-4" /> Add Expense
                    </button>
                  </div>
                  {expenses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No expenses tracked yet</p>
                      <p className="text-xs mt-1">Add your server, SMS, and other costs</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {expenses.map(exp => (
                        <div key={exp.id} className="flex items-center gap-3 p-3 bg-dark-200/60 rounded-xl border border-gray-800/50">
                          <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', {
                            'bg-blue-400': exp.category === 'infrastructure',
                            'bg-green-400': exp.category === 'sms',
                            'bg-purple-400': exp.category === 'marketing',
                            'bg-amber-400': exp.category === 'software',
                            'bg-gray-400': exp.category === 'other',
                          })} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{exp.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-dark-300 text-gray-400 capitalize">{exp.category}</span>
                              <span className={clsx('text-xs px-2 py-0.5 rounded-full',
                                exp.frequency === 'yearly' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400')}>
                                {exp.frequency}
                              </span>
                            </div>
                            {exp.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{exp.notes}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-white">ETB {parseFloat(exp.amount).toLocaleString()}</p>
                            {exp.frequency === 'yearly' && (
                              <p className="text-xs text-gray-500">≈ ETB {Math.round(exp.amount/12).toLocaleString()}/mo</p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => { setExpForm({ name: exp.name, category: exp.category, amount: String(exp.amount), frequency: exp.frequency, notes: exp.notes || '' }); setExpModal(exp); }}
                              className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-300 rounded-lg transition-colors">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={async () => {
                              if (!confirm(`Remove "${exp.name}"?`)) return;
                              await adminFetch(`/financials/expenses/${exp.id}`, { method: 'DELETE' });
                              await loadFinancials();
                            }}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Category breakdown — bars + donut — always show if any expense data exists (incl. auto SMS) */}
                  {(() => {
                    const CAT_COLORS = { infrastructure: '#3b82f6', sms: '#22c55e', marketing: '#a855f7', software: '#f59e0b', other: '#6b7280' };
                    const breakdown = financials.expense_breakdown || {};
                    const cats = Object.entries(breakdown).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
                    const totalCat = cats.reduce((s, [, v]) => s + v, 0);
                    if (!cats.length) return null;
                    return (
                      <div className={clsx('flex gap-6 items-center', expenses.length > 0 ? 'mt-4 pt-4 border-t border-gray-800' : 'mt-2')}>
                        <DonutChart size={110} thickness={20} segments={cats.map(([cat, v]) => ({ value: v, color: CAT_COLORS[cat] || '#6b7280' }))} />
                        <div className="flex-1 space-y-2">
                          {cats.map(([cat, val]) => (
                            <div key={cat}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-gray-400 capitalize flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: CAT_COLORS[cat] || '#6b7280' }} />
                                  {cat}{cat === 'sms' && (financials.auto_sms_cost || 0) > 0 ? ' (incl. usage)' : ''}
                                </span>
                                <span className="text-gray-300 font-medium">ETB {Math.round(val).toLocaleString()}<span className="text-gray-600">/mo</span></span>
                              </div>
                              <div className="h-1.5 bg-dark-300 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((val / totalCat) * 100)}%`, backgroundColor: CAT_COLORS[cat] || '#6b7280' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Auto SMS Cost */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">SMS Usage Cost</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Auto-calculated from messages sent by all gyms this month</p>
                    </div>
                    {!smsRateEdit && (
                      <button onClick={() => { setSmsRateEdit(true); setSmsRateValue(String(financials.sms_rate_per_msg ?? 0)); }}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-300 rounded-lg transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Message count */}
                    <div className="flex-1 p-4 bg-dark-200/60 rounded-xl border border-gray-800/50">
                      <p className="text-xs text-gray-500 mb-1">Messages sent this month</p>
                      <p className="text-2xl font-bold text-white">{(financials.auto_sms_count || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">across all gym accounts</p>
                    </div>
                    {/* Rate */}
                    <div className="flex-1 p-4 bg-dark-200/60 rounded-xl border border-gray-800/50">
                      <p className="text-xs text-gray-500 mb-1">Rate per message</p>
                      {smsRateEdit ? (
                        <div className="flex gap-2 mt-1">
                          <input type="number" step="0.01" min="0" value={smsRateValue}
                            onChange={e => setSmsRateValue(e.target.value)}
                            className="input-field flex-1 text-sm" placeholder="ETB per SMS" autoFocus />
                          <button onClick={async () => {
                            try {
                              await adminFetch('/financials/sms-rate', { method: 'PUT', body: JSON.stringify({ rate: parseFloat(smsRateValue) }) });
                              setSmsRateEdit(false); loadFinancials();
                            } catch (e) { alert(e.message); }
                          }} className="px-3 py-2 bg-gym-600 text-white rounded-lg text-sm hover:bg-gym-500 transition-colors">Save</button>
                          <button onClick={() => setSmsRateEdit(false)} className="px-3 py-2 bg-dark-300 text-gray-400 rounded-lg text-sm">✕</button>
                        </div>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-white">ETB {(financials.sms_rate_per_msg ?? 0).toLocaleString()}<span className="text-sm font-normal text-gray-500">/msg</span></p>
                          {(financials.sms_rate_per_msg ?? 0) === 0 && (
                            <p className="text-xs text-amber-400 mt-1">⚠ Set your rate per SMS to calculate cost</p>
                          )}
                        </>
                      )}
                    </div>
                    {/* Total */}
                    <div className="flex-1 p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                      <p className="text-xs text-gray-500 mb-1">Auto SMS cost this month</p>
                      <p className="text-2xl font-bold text-red-400">ETB {Math.round(financials.auto_sms_cost || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(financials.auto_sms_count || 0).toLocaleString()} × ETB {financials.sms_rate_per_msg ?? 0}
                      </p>
                    </div>
                  </div>
                  {/* SMS Trend */}
                  {smsHistory.length > 1 && (() => {
                    const maxCount = Math.max(...smsHistory.map(r => parseInt(r.sent_count || 0)), 1);
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    return (
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <p className="text-xs text-gray-500 mb-3">Monthly send volume (last 6 months)</p>
                        <div className="flex items-end gap-1.5 h-14">
                          {smsHistory.map(row => {
                            const h = Math.max(4, Math.round((parseInt(row.sent_count || 0) / maxCount) * 52));
                            const isCurrent = row.month === currentMonth;
                            return (
                              <div key={row.month} className="flex-1 flex flex-col items-center gap-1 group" title={`${row.month}: ${parseInt(row.sent_count || 0).toLocaleString()} SMS`}>
                                <div className={clsx('w-full rounded-t-sm transition-all', isCurrent ? 'bg-green-500/80' : 'bg-gray-600/60 group-hover:bg-gray-500/80')} style={{ height: h }} />
                                <p className="text-[9px] text-gray-600">{row.month.slice(5)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Plan Pricing */}
                <div className="card p-6">
                  <h3 className="text-base font-semibold text-white mb-4">Plan Pricing</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['starter','pro'].map(plan => (
                      <div key={plan} className="p-4 bg-dark-200/60 rounded-xl border border-gray-800/50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-white capitalize">{plan} Plan</span>
                          <button onClick={() => { setPriceEdit(plan); setPriceValue(String(planPrices[plan])); }}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-300 rounded-lg transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {priceEdit === plan ? (
                          <div className="flex gap-2">
                            <input type="number" value={priceValue} onChange={e => setPriceValue(e.target.value)}
                              className="input-field flex-1 text-sm" placeholder="Price in ETB" autoFocus />
                            <button onClick={async () => {
                              try {
                                await adminFetch(`/financials/plan-prices/${plan}`, { method: 'PUT', body: JSON.stringify({ price: parseFloat(priceValue) }) });
                                setPriceEdit(null); loadFinancials();
                              } catch (e) { alert(e.message); }
                            }} className="px-3 py-2 bg-gym-600 text-white rounded-lg text-sm hover:bg-gym-500 transition-colors">
                              Save
                            </button>
                            <button onClick={() => setPriceEdit(null)} className="px-3 py-2 bg-dark-300 text-gray-400 rounded-lg text-sm">✕</button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-2xl font-bold text-gym-400">ETB {planPrices[plan]?.toLocaleString()}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                            <p className="text-xs text-gray-500 mt-1">{financials[plan + '_count']} active gyms · ETB {((financials[plan + '_count'] || 0) * (planPrices[plan] || 0)).toLocaleString()}/mo revenue</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* History chart */}
                {finHistory.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-base font-semibold text-white mb-4">Monthly P&L History</h3>
                    <div className="overflow-x-auto">
                      <div className="flex items-end gap-2 min-w-[400px]" style={{ height: 160 }}>
                        {(() => {
                          const maxVal = Math.max(...finHistory.map(s => Math.max(s.mrr || 0, s.total_expenses || 0)), 1);
                          return finHistory.map(snap => {
                          const revenueH = Math.round(((snap.mrr || 0) / maxVal) * 140);
                          const expenseH = Math.round(((snap.total_expenses || 0) / maxVal) * 140);
                          const profit = (snap.net_profit || 0);
                          return (
                            <div key={snap.month} className="flex-1 flex flex-col items-center gap-1 group" title={`${snap.month}: MRR ETB ${snap.mrr?.toLocaleString()}, Expenses ETB ${Math.round(snap.total_expenses)?.toLocaleString()}, Profit ETB ${Math.round(profit)?.toLocaleString()}`}>
                              <div className="w-full flex items-end gap-0.5" style={{ height: 140 }}>
                                <div className="flex-1 rounded-t-sm transition-all group-hover:opacity-90" style={{ height: revenueH, backgroundColor: profit >= 0 ? '#4ade80' : '#86efac', opacity: 0.7 }} />
                                <div className="flex-1 bg-red-500/60 rounded-t-sm transition-all group-hover:bg-red-400" style={{ height: expenseH }} />
                              </div>
                              <div className={clsx('w-full h-0.5 rounded-full mb-0.5', profit >= 0 ? 'bg-emerald-500' : 'bg-red-500')} />
                              <p className="text-[9px] text-gray-600">{snap.month.slice(5)}</p>
                            </div>
                          );
                        });
                        })()}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500/70 rounded-sm inline-block" /> Revenue</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500/60 rounded-sm inline-block" /> Expenses</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="card p-12 text-center text-gray-500">
                <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-gray-300 mb-1">Could not load financials</p>
                {finError && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-2 mb-3 max-w-sm mx-auto font-mono break-all">
                    {finError}
                  </p>
                )}
                <button onClick={loadFinancials} className="mt-3 px-4 py-2 bg-dark-200 rounded-lg text-sm text-gray-400 hover:text-white">Retry</button>
              </div>
            )}

            {/* Add / Edit Expense Modal */}
            {expModal && (
              <Modal onClose={() => setExpModal(null)}>
                <h3 className="text-lg font-semibold text-white mb-4">{expModal === 'add' ? 'Add Expense' : 'Edit Expense'}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Name *</label>
                    <input value={expForm.name} onChange={e => setExpForm(p => ({...p, name: e.target.value}))}
                      className="input-field w-full" placeholder="e.g. Railway hosting" autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Category</label>
                      <select value={expForm.category} onChange={e => setExpForm(p => ({...p, category: e.target.value}))} className="input-field w-full [&>option]:bg-gray-900">
                        <option value="infrastructure">Infrastructure</option>
                        <option value="sms">SMS / Comms</option>
                        <option value="marketing">Marketing</option>
                        <option value="software">Software</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Frequency</label>
                      <select value={expForm.frequency} onChange={e => setExpForm(p => ({...p, frequency: e.target.value}))} className="input-field w-full [&>option]:bg-gray-900">
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Amount (ETB) *</label>
                    <input type="number" value={expForm.amount} onChange={e => setExpForm(p => ({...p, amount: e.target.value}))}
                      className="input-field w-full" placeholder="0" min="0" />
                    {expForm.frequency === 'yearly' && expForm.amount && (
                      <p className="text-xs text-gray-500 mt-1">≈ ETB {Math.round(parseFloat(expForm.amount)/12).toLocaleString()}/month</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
                    <input value={expForm.notes} onChange={e => setExpForm(p => ({...p, notes: e.target.value}))}
                      className="input-field w-full" placeholder="e.g. GeezSMS API plan" />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setExpModal(null)} className="flex-1 px-4 py-2.5 bg-dark-200 text-white rounded-xl hover:bg-dark-300 transition-all">Cancel</button>
                  <button
                    disabled={expSaving}
                    onClick={async () => {
                      if (!expForm.name.trim() || !expForm.amount) return alert('Name and amount required');
                      setExpSaving(true);
                      try {
                        if (expModal === 'add') {
                          await adminFetch('/financials/expenses', { method: 'POST', body: JSON.stringify(expForm) });
                        } else {
                          await adminFetch(`/financials/expenses/${expModal.id}`, { method: 'PUT', body: JSON.stringify(expForm) });
                        }
                        setExpModal(null);
                        loadFinancials();
                      } catch (e) { alert(e.message); }
                      finally { setExpSaving(false); }
                    }}
                    className="flex-1 px-4 py-2.5 bg-gym-600 hover:bg-gym-500 text-white rounded-xl transition-all disabled:opacity-50">
                    {expSaving ? 'Saving...' : expModal === 'add' ? 'Add Expense' : 'Update Expense'}
                  </button>
                </div>
              </Modal>
            )}
          </div>
        )}

        {/* ══ ACTIVITY LOG ══════════════════════════════════════════════════════ */}
        {activeTab === 'activity' && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Activity (Last 100)</h2>
              {activityLog.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No activity recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {activityLog.map((log, i) => {
                    let details = {};
                    try { details = JSON.parse(log.details || '{}'); } catch {}
                    const actionLabels = {
                      admin_plan_change: { label: 'Plan changed', color: 'text-blue-400', icon: Crown },
                      admin_extend:      { label: 'Subscription extended', color: 'text-green-400', icon: CalendarClock },
                      customer_added:    { label: 'Member added', color: 'text-gym-400', icon: Users },
                      customer_deleted:  { label: 'Member deleted', color: 'text-red-400', icon: Trash2 },
                      payment_added:     { label: 'Payment recorded', color: 'text-green-400', icon: DollarSign },
                      check_in:          { label: 'Check-in', color: 'text-gray-400', icon: Zap },
                    };
                    const meta = actionLabels[log.action] || { label: log.action, color: 'text-gray-400', icon: Activity };
                    const Icon = meta.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 bg-dark-200/40 rounded-xl">
                        <div className="w-7 h-7 rounded-lg bg-dark-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className={clsx('w-3.5 h-3.5', meta.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx('text-sm font-medium', meta.color)}>{meta.label}</span>
                            {log.gym_name && <span className="text-xs text-gray-300 bg-dark-300 px-2 py-0.5 rounded">{log.gym_name}</span>}
                          </div>
                          {Object.keys(details).length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {Object.entries(details).filter(([k]) => k !== 'by').map(([k, v]) => `${k}: ${v}`).join(' · ')}
                              {details.by && <span className="ml-2 text-gray-600">by {details.by}</span>}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 flex-shrink-0">{log.created_at ? new Date(log.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ══ REVIEW MODAL ════════════════════════════════════════════════════════ */}
      {reviewModal && (
        <Modal onClose={() => setReviewModal(null)}>
          <div className="flex items-center gap-3 mb-4">
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', reviewModal.action === 'approve' ? 'bg-green-500/20' : 'bg-red-500/20')}>
              {reviewModal.action === 'approve' ? <CheckCircle className="w-6 h-6 text-green-400" /> : <XCircle className="w-6 h-6 text-red-400" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white capitalize">{reviewModal.action} Request</h3>
              <p className="text-sm text-gray-400">{reviewModal.request.gym_name}</p>
            </div>
          </div>
          <div className="p-4 bg-dark-200 rounded-xl space-y-2 text-sm mb-4">
            <Row label="Plan"           value={<PlanBadge plan={reviewModal.request.requested_plan} />} />
            <Row label="Duration"       value={`${reviewModal.request.duration_months || 1} month(s)`} />
            <Row label="Amount"         value={<span className="text-green-400 font-medium">ETB {(reviewModal.request.amount_paid || 0).toLocaleString()}</span>} />
            <Row label="Transaction ID" value={<span className="font-mono text-xs">{reviewModal.request.transaction_id}</span>} />
            <Row label="Payment via"    value={<span className="capitalize">{reviewModal.request.payment_method?.replace('_', ' ')}</span>} />
          </div>
          {reviewModal.request.payment_proof && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Payment Proof</p>
              <img src={reviewModal.request.payment_proof} alt="Payment proof"
                className="w-full max-h-48 object-contain rounded-xl border border-gray-700 cursor-pointer"
                onClick={() => window.open(reviewModal.request.payment_proof, '_blank')} />
            </div>
          )}
          {reviewModal.action === 'decline' && (
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reason <span className="text-red-400">*</span></label>
                <select value={declineReason} onChange={e => { setDeclineReason(e.target.value); setAdminNotes(''); }} className="input-field">
                  <option value="">— Select a reason —</option>
                  {DECLINE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {declineReason === 'Other' && (
                <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                  className="input-field h-20 resize-none" placeholder="Explain the reason…" />
              )}
              {declineReason && declineReason !== 'Other' && (
                <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                  className="input-field h-16 resize-none" placeholder="Additional details (optional)" />
              )}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setReviewModal(null)} className="flex-1 px-4 py-2.5 bg-dark-200 text-white rounded-xl font-medium hover:bg-dark-300 transition-all">Cancel</button>
            <button onClick={handleReview}
              disabled={processing || (reviewModal.action === 'decline' && (!declineReason || (declineReason === 'Other' && !adminNotes.trim())))}
              className={clsx('flex-1 px-4 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2',
                reviewModal.action === 'approve' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white')}>
              {processing ? <Spinner /> : reviewModal.action === 'approve' ? <><Check className="w-4 h-4" /> Approve & Activate</> : <><X className="w-4 h-4" /> Decline Request</>}
            </button>
          </div>
        </Modal>
      )}

      {/* ══ GYM DETAIL MODAL ════════════════════════════════════════════════════ */}
      {gymDetail && (
        <Modal onClose={() => setGymDetail(null)} wide>
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                {gymDetail.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{gymDetail.name}</h3>
                <p className="text-gray-400 text-sm">{gymDetail.slug}</p>
              </div>
            </div>
            <button onClick={() => setGymDetail(null)} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <Section title="Contact">
              <Row label="Email"   value={gymDetail.email} />
              <Row label="Phone"   value={gymDetail.phone || '—'} />
              <Row label="Address" value={gymDetail.address || '—'} />
            </Section>
            <Section title="Subscription">
              <Row label="Plan"        value={<PlanBadge plan={gymDetail.subscription_plan} />} />
              <Row label="Status"      value={<StatusBadge status={gymDetail.subscription_status} />} />
              <Row label="Started"     value={gymDetail.subscription_start || '—'} />
              <Row label="Expires"     value={gymDetail.subscription_end || '—'} />
              <Row label="Max Members" value={gymDetail.max_members === -1 ? 'Unlimited' : gymDetail.max_members} />
            </Section>
            <Section title="Activity">
              <Row label="Total Members" value={gymDetail.member_count || 0} />
              <Row label="Payments"      value={gymDetail.payment_count || 0} />
              <Row label="Total Revenue" value={`ETB ${(gymDetail.total_revenue || 0).toLocaleString()}`} />
              <Row label="Registered"    value={gymDetail.created_at ? new Date(gymDetail.created_at).toLocaleDateString() : '—'} />
            </Section>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => { setGymDetail(null); setSetPlanModal(gymDetail); setPlanForm({ plan: gymDetail.subscription_plan || 'starter', months: 1, notes: '' }); }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-sm font-medium transition-colors">
              <Crown className="w-4 h-4" /> Change Plan
            </button>
            <button onClick={() => { setGymDetail(null); setExtendModal(gymDetail); setExtendDate(gymDetail.subscription_end?.slice(0,10) || ''); setExtendNotes(''); }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-sm font-medium transition-colors">
              <CalendarClock className="w-4 h-4" /> Extend
            </button>
          </div>
        </Modal>
      )}

      {/* ══ SET PLAN MODAL ══════════════════════════════════════════════════════ */}
      {setPlanModal && (
        <Modal onClose={() => setSetPlanModal(null)}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center"><Crown className="w-6 h-6 text-blue-400" /></div>
            <div>
              <h3 className="text-lg font-semibold text-white">Change Plan</h3>
              <p className="text-sm text-gray-400">{setPlanModal.name}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">New Plan</label>
              <div className="grid grid-cols-2 gap-2">
                {['free', 'starter', 'pro', 'enterprise'].map(p => (
                  <button key={p} type="button" onClick={() => setPlanForm(f => ({ ...f, plan: p }))}
                    className={clsx('px-4 py-3 rounded-xl text-sm font-medium capitalize border-2 transition-all',
                      planForm.plan === p ? 'border-gym-500 bg-gym-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600')}>
                    {p}
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {p === 'free' ? '10 members' : p === 'starter' ? '100 members' : 'Unlimited'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {planForm.plan !== 'free' && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Duration (months)</label>
                <input type="number" min={1} max={24} value={planForm.months}
                  onChange={e => setPlanForm(f => ({ ...f, months: parseInt(e.target.value) || 1 }))}
                  className="input-field" />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
              <input type="text" value={planForm.notes} onChange={e => setPlanForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Reason for manual change…" className="input-field" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setSetPlanModal(null)} className="flex-1 px-4 py-2.5 bg-dark-200 text-white rounded-xl font-medium hover:bg-dark-300 transition-all">Cancel</button>
            <button onClick={handleSetPlan} disabled={planSaving}
              className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {planSaving ? <Spinner /> : <><Save className="w-4 h-4" /> Apply Change</>}
            </button>
          </div>
        </Modal>
      )}

      {/* ══ EXTEND MODAL ════════════════════════════════════════════════════════ */}
      {extendModal && (
        <Modal onClose={() => setExtendModal(null)}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center"><CalendarClock className="w-6 h-6 text-green-400" /></div>
            <div>
              <h3 className="text-lg font-semibold text-white">Extend Subscription</h3>
              <p className="text-sm text-gray-400">{extendModal.name}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Current expiry</label>
              <p className="text-white">{extendModal.subscription_end ? new Date(extendModal.subscription_end).toLocaleDateString() : 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">New end date <span className="text-red-400">*</span></label>
              <input type="date" value={extendDate} onChange={e => setExtendDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
              <input type="text" value={extendNotes} onChange={e => setExtendNotes(e.target.value)}
                placeholder="Reason for extension…" className="input-field" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setExtendModal(null)} className="flex-1 px-4 py-2.5 bg-dark-200 text-white rounded-xl font-medium hover:bg-dark-300">Cancel</button>
            <button onClick={handleExtend} disabled={extendSaving || !extendDate}
              className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {extendSaving ? <Spinner /> : <><Save className="w-4 h-4" /> Save Date</>}
            </button>
          </div>
        </Modal>
      )}

      {/* ══ BROADCAST MODAL ═════════════════════════════════════════════════════ */}
      {broadcastModal && (
        <Modal onClose={() => setBroadcastModal(false)}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center"><Megaphone className="w-6 h-6 text-yellow-400" /></div>
            <div>
              <h3 className="text-lg font-semibold text-white">Broadcast Announcement</h3>
              <p className="text-sm text-gray-400">Shown as a banner to all gyms in their dashboard</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Type</label>
              <div className="flex gap-2">
                {[['info','blue','Info'],['warning','amber','Warning'],['success','green','Success']].map(([t, c, l]) => (
                  <button key={t} type="button" onClick={() => setBroadcastType(t)}
                    className={clsx('flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all capitalize',
                      broadcastType === t ? `border-${c}-500 bg-${c}-500/10 text-${c}-400` : 'border-gray-700 text-gray-400 hover:border-gray-600')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Message</label>
              <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                className="input-field h-24 resize-none" placeholder="e.g. Scheduled maintenance tonight at 11 PM…" />
            </div>
            {currentBroadcast && (
              <div className="p-3 bg-dark-200 rounded-xl text-xs text-gray-400">
                Current: "{currentBroadcast.message}"
                <button onClick={() => { clearBroadcast(); setBroadcastModal(false); }} className="ml-2 text-red-400 hover:text-red-300">Clear it</button>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setBroadcastModal(false)} className="flex-1 px-4 py-2.5 bg-dark-200 text-white rounded-xl font-medium hover:bg-dark-300">Cancel</button>
            <button onClick={handleBroadcast} disabled={broadcastSaving || !broadcastMsg.trim()}
              className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {broadcastSaving ? <Spinner /> : <><Megaphone className="w-4 h-4" /> Send Broadcast</>}
            </button>
          </div>
        </Modal>
      )}

      {/* ══ DELETE CONFIRM ══════════════════════════════════════════════════════ */}
      {deleteConfirm && (
        <Modal onClose={() => !deleting && setDeleteConfirm(null)} danger>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0"><Trash2 className="w-6 h-6 text-red-400" /></div>
            <div><h3 className="text-lg font-semibold text-white">Delete Gym</h3><p className="text-sm text-gray-400">This action cannot be undone</p></div>
          </div>
          <div className="p-4 bg-red-500/8 border border-red-500/20 rounded-xl mb-4">
            <p className="text-white font-semibold">{deleteConfirm.name}</p>
            <p className="text-sm text-gray-400 mt-0.5">{deleteConfirm.email}</p>
            <div className="mt-2 flex gap-4 text-xs text-gray-500">
              <span>{deleteConfirm.member_count || 0} members</span>
              <span>ETB {(deleteConfirm.total_revenue || 0).toLocaleString()} revenue</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-5">All members, payments, attendance records, staff and subscription data will be permanently deleted.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="flex-1 px-4 py-2.5 bg-dark-200 text-white rounded-xl font-medium hover:bg-dark-300 disabled:opacity-50">Cancel</button>
            <button onClick={handleDeleteGym} disabled={deleting}
              className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {deleting ? <Spinner /> : <><Trash2 className="w-4 h-4" /> Delete Permanently</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );

  function openReview(request, action) {
    setReviewModal({ request, action });
    setAdminNotes('');
    setDeclineReason('');
  }
}

// ── Reusable components ───────────────────────────────────────────────────────
function Modal({ children, onClose, wide, danger }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-dark-100 border rounded-2xl shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto',
        wide ? 'w-full max-w-lg' : 'w-full max-w-md',
        danger ? 'border-red-500/30' : 'border-gray-800',
        'p-6')}>
        {children}
      </div>
    </div>
  );
}

function Spinner() { return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />; }

function Section({ title, children }) {
  return (
    <div className="p-4 bg-dark-200 rounded-xl">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function PlanBadge({ plan, large }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded font-medium capitalize', large ? 'text-sm px-3 py-1' : 'text-xs', PLAN_COLORS[plan] || PLAN_COLORS.free)}>
      {plan}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', STATUS_COLORS[status] || 'bg-gray-500/20 text-gray-400')}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = { green: 'from-green-500 to-green-600', blue: 'from-blue-500 to-blue-600', yellow: 'from-yellow-500 to-yellow-600', purple: 'from-purple-500 to-purple-600' };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={clsx('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', colors[color])}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
    </div>
  );
}
