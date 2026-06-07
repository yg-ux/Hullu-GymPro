import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, DollarSign, TrendingUp, AlertCircle,
  Check, X, Clock, Crown, LogOut, RefreshCw, ChevronRight,
  CheckCircle, XCircle, Phone, Mail, Calendar, Hash,
  CreditCard, Search, Filter, Eye, Shield
} from 'lucide-react';
import clsx from 'clsx';

const ADMIN_API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

function adminFetch(path, options = {}) {
  const token = localStorage.getItem('adminToken');
  return fetch(`${ADMIN_API_BASE}/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  }).then(async res => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [gyms, setGyms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [processing, setProcessing] = useState(null);
  const [gymSearch, setGymSearch] = useState('');
  const [requestFilter, setRequestFilter] = useState('pending');

  // Review modal
  const [reviewModal, setReviewModal] = useState(null); // { request, action: 'approve'|'decline' }
  const [adminNotes, setAdminNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');

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

  // Gym detail modal
  const [gymDetail, setGymDetail] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin-login');
      return;
    }
    // Verify token is still valid before loading data
    adminFetch('/verify')
      .then(() => loadData())
      .catch(() => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin-login');
      });
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [statsData, gymsData, requestsData] = await Promise.all([
        adminFetch('/stats'),
        adminFetch('/gyms'),
        adminFetch('/subscription-requests'),
      ]);
      setStats(statsData);
      setGyms(Array.isArray(gymsData) ? gymsData : []);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      setLoadError(error.message || 'Failed to load data. Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const openReview = (request, action) => {
    setReviewModal({ request, action });
    setAdminNotes('');
    setDeclineReason('');
  };

  const handleReview = async () => {
    if (!reviewModal) return;
    const { request, action } = reviewModal;

    // For declines, build the final note from dropdown + optional custom text
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
        method: 'POST',
        body: JSON.stringify({ admin_notes: finalNote || null }),
      });
      setReviewModal(null);
      loadData();
    } catch (error) {
      alert(error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin-login');
  };

  const filteredGyms = gyms.filter(g =>
    !gymSearch || g.name?.toLowerCase().includes(gymSearch.toLowerCase()) ||
    g.email?.toLowerCase().includes(gymSearch.toLowerCase())
  );

  const filteredRequests = requests.filter(r =>
    requestFilter === 'all' || r.status === requestFilter
  );

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-gym-500 border-t-transparent animate-spin" />
      </div>
    );
  }

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
            <button onClick={loadData} className="p-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-lg transition-colors" title="Refresh">
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
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-dark-200 rounded-xl p-1 w-fit">
          {[
            { key: 'overview', label: 'Overview', icon: TrendingUp },
            { key: 'gyms', label: `Gyms (${gyms.length})`, icon: Building2 },
            { key: 'requests', label: 'Requests', icon: Clock, badge: pendingCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.key ? 'bg-gym-600 text-white' : 'text-gray-400 hover:text-white hover:bg-dark-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-xs rounded-full font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {loadError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load data</p>
              <p className="text-sm opacity-80">{loadError}</p>
            </div>
            <button onClick={loadData} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Gyms" value={stats?.total_gyms || 0} icon={Building2} color="blue" />
              <StatCard title="Active" value={stats?.active_gyms || 0} icon={CheckCircle} color="green" />
              <StatCard title="On Trial" value={stats?.trial_gyms || 0} icon={Clock} color="yellow" />
              <StatCard title="Total Revenue" value={`ETB ${(stats?.total_revenue || 0).toLocaleString()}`} icon={DollarSign} color="purple" />
            </div>

            {pendingCount > 0 && (
              <div className="card p-5 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{pendingCount} Subscription Request{pendingCount > 1 ? 's' : ''} Awaiting Review</p>
                    <p className="text-gray-400 text-sm">Review and approve or decline subscription upgrade requests</p>
                  </div>
                  <button onClick={() => setActiveTab('requests')} className="btn-primary flex items-center gap-2 whitespace-nowrap">
                    Review <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Plan distribution */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Plan Distribution</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {['free', 'starter', 'pro', 'enterprise'].map(plan => {
                  const count = gyms.filter(g => g.subscription_plan === plan).length;
                  const colors = {
                    free: 'text-gray-400 bg-gray-500/10',
                    starter: 'text-blue-400 bg-blue-500/10',
                    pro: 'text-purple-400 bg-purple-500/10',
                    enterprise: 'text-amber-400 bg-amber-500/10',
                  };
                  return (
                    <div key={plan} className={clsx('p-4 rounded-xl text-center', colors[plan])}>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm capitalize">{plan}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent registrations */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Registrations</h2>
              <div className="space-y-3">
                {gyms.slice(0, 5).map(gym => (
                  <div key={gym.id} className="flex items-center justify-between p-4 bg-dark-200/60 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                        {gym.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{gym.name}</p>
                        <p className="text-xs text-gray-400">{gym.email}</p>
                      </div>
                    </div>
                    <PlanBadge plan={gym.subscription_plan} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GYMS TAB ── */}
        {activeTab === 'gyms' && (
          <div className="space-y-4 animate-fade-in">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search gyms by name or email..."
                value={gymSearch}
                onChange={e => setGymSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800 text-xs uppercase tracking-wider">
                    <th className="p-4">Gym</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4 text-center">Members</th>
                    <th className="p-4 text-right">Revenue</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Expires</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filteredGyms.map(gym => (
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
                      <td className="p-4 text-right text-green-400 font-medium">
                        ETB {(gym.total_revenue || 0).toLocaleString()}
                      </td>
                      <td className="p-4"><StatusBadge status={gym.subscription_status} /></td>
                      <td className="p-4 text-gray-400 text-xs">
                        {gym.subscription_end ? new Date(gym.subscription_end).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setGymDetail(gym)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-300 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredGyms.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-500">No gyms found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── REQUESTS TAB ── */}
        {activeTab === 'requests' && (
          <div className="space-y-4 animate-fade-in">
            {/* Filter */}
            <div className="flex gap-2">
              {['pending', 'approved', 'declined', 'all'].map(f => (
                <button
                  key={f}
                  onClick={() => setRequestFilter(f)}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
                    requestFilter === f ? 'bg-gym-600 text-white' : 'bg-dark-200 text-gray-400 hover:text-white'
                  )}
                >
                  {f} {f !== 'all' && `(${requests.filter(r => r.status === f).length})`}
                </button>
              ))}
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
                        <p className="text-sm text-gray-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {req.gym_email}
                          {req.gym_phone && <><Phone className="w-3 h-3 ml-2" /> {req.gym_phone}</>}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <span className="flex items-center gap-1 text-sm text-gray-300">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            ETB {(req.amount_paid || 0).toLocaleString()}
                          </span>
                          <span className="text-gray-500 text-sm capitalize">{req.payment_method?.replace('_', ' ')}</span>
                          <span className="flex items-center gap-1 text-sm font-mono text-gym-400 bg-gym-500/10 px-2 py-0.5 rounded">
                            <Hash className="w-3 h-3" />{req.transaction_id}
                          </span>
                          <span className="text-sm text-gray-400">
                            {req.duration_months || 1} month{(req.duration_months || 1) > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Submitted {new Date(req.created_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {req.admin_notes && (
                          <p className="text-sm text-gray-400 italic mt-1">Note: {req.admin_notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <PlanBadge plan={req.requested_plan} large />
                      <StatusBadge status={req.status} />
                      {req.status === 'pending' && (
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => openReview(req, 'approve')}
                            disabled={processing === req.id}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" /> Approve
                          </button>
                          <button
                            onClick={() => openReview(req, 'decline')}
                            disabled={processing === req.id}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                          >
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
      </main>

      {/* ── Review Modal ── */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setReviewModal(null)} />
          <div className="relative bg-dark-100 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                reviewModal.action === 'approve' ? 'bg-green-500/20' : 'bg-red-500/20'
              )}>
                {reviewModal.action === 'approve'
                  ? <CheckCircle className="w-6 h-6 text-green-400" />
                  : <XCircle className="w-6 h-6 text-red-400" />
                }
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white capitalize">
                  {reviewModal.action} Request
                </h3>
                <p className="text-sm text-gray-400">{reviewModal.request.gym_name}</p>
              </div>
            </div>

            {/* Request summary */}
            <div className="p-4 bg-dark-200 rounded-xl space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Plan</span>
                <PlanBadge plan={reviewModal.request.requested_plan} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Duration</span>
                <span className="text-white">{reviewModal.request.duration_months || 1} month(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount</span>
                <span className="text-green-400 font-medium">ETB {(reviewModal.request.amount_paid || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Transaction ID</span>
                <span className="text-white font-mono text-xs">{reviewModal.request.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment via</span>
                <span className="text-white capitalize">{reviewModal.request.payment_method?.replace('_', ' ')}</span>
              </div>
            </div>

            {reviewModal.action === 'decline' ? (
              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reason for decline <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={declineReason}
                    onChange={e => { setDeclineReason(e.target.value); setAdminNotes(''); }}
                    className="input-field"
                  >
                    <option value="">— Select a reason —</option>
                    {DECLINE_REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {declineReason === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Describe the reason <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      className="input-field h-20 resize-none"
                      placeholder="Explain why this request is being declined…"
                    />
                  </div>
                )}
                {declineReason && declineReason !== 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Additional details (optional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      className="input-field h-16 resize-none"
                      placeholder="Add any extra context for the gym owner…"
                    />
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={() => setReviewModal(null)}
                className="flex-1 px-4 py-2.5 bg-dark-200 text-white rounded-xl font-medium hover:bg-dark-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={processing || (reviewModal.action === 'decline' && (!declineReason || (declineReason === 'Other' && !adminNotes.trim())))}
                className={clsx(
                  'flex-1 px-4 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2',
                  reviewModal.action === 'approve'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                )}
              >
                {processing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : reviewModal.action === 'approve' ? (
                  <><Check className="w-4 h-4" /> Approve & Activate</>
                ) : (
                  <><X className="w-4 h-4" /> Decline Request</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gym Detail Modal ── */}
      {gymDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setGymDetail(null)} />
          <div className="relative bg-dark-100 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
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
              <button onClick={() => setGymDetail(null)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Section title="Contact">
                <Row label="Email" value={gymDetail.email} />
                <Row label="Phone" value={gymDetail.phone || '—'} />
                <Row label="Address" value={gymDetail.address || '—'} />
              </Section>
              <Section title="Subscription">
                <Row label="Plan" value={<PlanBadge plan={gymDetail.subscription_plan} />} />
                <Row label="Status" value={<StatusBadge status={gymDetail.subscription_status} />} />
                <Row label="Started" value={gymDetail.subscription_start || '—'} />
                <Row label="Expires" value={gymDetail.subscription_end || '—'} />
                <Row label="Max Members" value={gymDetail.max_members === -1 ? 'Unlimited' : gymDetail.max_members} />
              </Section>
              <Section title="Activity">
                <Row label="Total Members" value={gymDetail.member_count || 0} />
                <Row label="Total Revenue" value={`ETB ${(gymDetail.total_revenue || 0).toLocaleString()}`} />
                <Row label="Registered" value={new Date(gymDetail.created_at).toLocaleDateString()} />
              </Section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const styles = {
    free: 'bg-gray-500/20 text-gray-400',
    starter: 'bg-blue-500/20 text-blue-400',
    pro: 'bg-purple-500/20 text-purple-400',
    enterprise: 'bg-amber-500/20 text-amber-400',
  };
  return (
    <span className={clsx(
      'px-2 py-0.5 rounded font-medium capitalize',
      large ? 'text-sm px-3 py-1' : 'text-xs',
      styles[plan] || styles.free
    )}>
      {plan}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-500/20 text-green-400',
    trial: 'bg-yellow-500/20 text-yellow-400',
    expired: 'bg-red-500/20 text-red-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    declined: 'bg-red-500/20 text-red-400',
    trial_expired: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', styles[status] || 'bg-gray-500/20 text-gray-400')}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
  };
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
