import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, Users, DollarSign, TrendingUp, AlertCircle,
  Check, X, Clock, Crown, LogOut, RefreshCw, ChevronRight,
  Calendar, CheckCircle, XCircle, Globe
} from 'lucide-react';
import clsx from 'clsx';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [gyms, setGyms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin-login');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, gymsRes, requestsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'https://hullu-gympro.onrender.com'}/api/admin/stats`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || 'https://hullu-gympro.onrender.com'}/api/admin/gyms`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || 'https://hullu-gympro.onrender.com'}/api/admin/subscription-requests`, { headers })
      ]);

      const [statsData, gymsData, requestsData] = await Promise.all([
        statsRes.json(),
        gymsRes.json(),
        requestsRes.json()
      ]);

      setStats(statsData);
      setGyms(Array.isArray(gymsData) ? gymsData : []);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    setProcessing(requestId);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://hullu-gympro.onrender.com'}/api/admin/approve-request/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ admin_notes: 'Approved by admin' })
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (requestId) => {
    setProcessing(requestId);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://hullu-gympro.onrender.com'}/api/admin/decline-request/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ admin_notes: 'Declined by admin' })
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to decline:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-gym-600/30 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-gym-500 border-t-transparent animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-100">
      {/* Header */}
      <header className="bg-dark-200 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Hullu Gyms</h1>
                <p className="text-xs text-gray-400">Admin Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={loadData}
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-dark-200 rounded-xl p-1 w-fit">
          {[
            { key: 'overview', label: 'Overview', icon: TrendingUp },
            { key: 'gyms', label: 'All Gyms', icon: Building2 },
            { key: 'requests', label: 'Requests', icon: Clock, badge: stats?.pending_requests }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-gym-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-dark-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Gyms"
                value={stats?.total_gyms || 0}
                icon={Building2}
                color="blue"
              />
              <StatCard
                title="Active Subscriptions"
                value={stats?.active_gyms || 0}
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="On Trial"
                value={stats?.trial_gyms || 0}
                icon={Clock}
                color="yellow"
              />
              <StatCard
                title="Total Revenue"
                value={stats?.total_revenue || 0}
                icon={DollarSign}
                color="purple"
                prefix="ETB "
              />
            </div>

            {/* Pending Requests Alert */}
            {stats?.pending_requests > 0 && (
              <div className="glass-card p-6 border border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {stats.pending_requests} Subscription Request{stats.pending_requests > 1 ? 's' : ''} Pending
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Review and approve or decline subscription upgrade requests
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    Review <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Plan Distribution */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Subscription Plan Distribution</h2>
              <div className="grid grid-cols-3 gap-4">
                {stats?.plan_distribution?.map(plan => (
                  <div key={plan.subscription_plan} className="bg-dark-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{plan.count}</p>
                    <p className="text-sm text-gray-400 capitalize">{plan.subscription_plan}</p>
                  </div>
                )) || (
                  <div className="col-span-3 text-center py-8 text-gray-500">
                    No subscription data available
                  </div>
                )}
              </div>
            </div>

            {/* Recent Registrations */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Registrations</h2>
              <div className="space-y-3">
                {stats?.recent_registrations?.map(gym => (
                  <div key={gym.id} className="flex items-center justify-between p-4 bg-dark-200/50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                        {gym.name?.charAt(0) || 'G'}
                      </div>
                      <div>
                        <p className="font-medium text-white">{gym.name}</p>
                        <p className="text-sm text-gray-400">{gym.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={clsx(
                        "px-2 py-1 rounded text-xs font-medium capitalize",
                        gym.subscription_plan === 'enterprise' && "bg-purple-500/20 text-purple-400",
                        gym.subscription_plan === 'pro' && "bg-blue-500/20 text-blue-400",
                        gym.subscription_plan === 'starter' && "bg-gray-500/20 text-gray-400"
                      )}>
                        {gym.subscription_plan}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{new Date(gym.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )) || (
                  <p className="text-center py-8 text-gray-500">No recent registrations</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Gyms Tab */}
        {activeTab === 'gyms' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">All Registered Gyms</h2>
                <p className="text-sm text-gray-400">{gyms.length} total gyms</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                      <th className="p-4 font-medium">Gym</th>
                      <th className="p-4 font-medium">Contact</th>
                      <th className="p-4 font-medium">Plan</th>
                      <th className="p-4 font-medium">Members</th>
                      <th className="p-4 font-medium">Revenue</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gyms.map((gym, index) => (
                      <tr key={gym.id} className="border-b border-gray-800/50 hover:bg-dark-200/50 transition-colors animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                              {gym.name?.charAt(0) || 'G'}
                            </div>
                            <div>
                              <p className="font-medium text-white">{gym.name}</p>
                              <p className="text-xs text-gray-500">{gym.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-300">{gym.email}</p>
                          <p className="text-xs text-gray-500">{gym.phone || 'No phone'}</p>
                        </td>
                        <td className="p-4">
                          <span className={clsx(
                            "px-2 py-1 rounded text-xs font-medium capitalize",
                            gym.subscription_plan === 'enterprise' && "bg-purple-500/20 text-purple-400",
                            gym.subscription_plan === 'pro' && "bg-blue-500/20 text-blue-400",
                            gym.subscription_plan === 'starter' && "bg-gray-500/20 text-gray-400"
                          )}>
                            {gym.subscription_plan}
                          </span>
                        </td>
                        <td className="p-4 text-white">{gym.member_count || 0}</td>
                        <td className="p-4 text-green-400">ETB {(gym.total_revenue || 0).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={clsx(
                            "px-2 py-1 rounded text-xs font-medium capitalize",
                            gym.subscription_status === 'active' && "bg-green-500/20 text-green-400",
                            gym.subscription_status === 'trial' && "bg-yellow-500/20 text-yellow-400",
                            gym.subscription_status === 'expired' && "bg-red-500/20 text-red-400"
                          )}>
                            {gym.subscription_status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">
                          {new Date(gym.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">Subscription Upgrade Requests</h2>
                <p className="text-sm text-gray-400">
                  {requests.filter(r => r.status === 'pending').length} pending,{' '}
                  {requests.filter(r => r.status === 'approved').length} approved,{' '}
                  {requests.filter(r => r.status === 'declined').length} declined
                </p>
              </div>

              {requests.length === 0 ? (
                <div className="p-12 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No subscription requests yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {requests.map((request, index) => (
                    <div key={request.id} className="p-6 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                            {request.gym_name?.charAt(0) || 'G'}
                          </div>
                          <div>
                            <p className="font-medium text-white text-lg">{request.gym_name}</p>
                            <p className="text-sm text-gray-400">{request.gym_email}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm text-gray-500">
                                Requested: {new Date(request.created_at).toLocaleDateString()}
                              </span>
                              {request.amount_paid && (
                                <span className="text-sm text-green-400">
                                  Paid: ETB {request.amount_paid.toLocaleString()}
                                </span>
                              )}
                              {request.payment_method && (
                                <span className="text-sm text-gray-500 capitalize">
                                  via {request.payment_method?.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold">
                              <span className={clsx(
                                request.requested_plan === 'enterprise' && "text-purple-400",
                                request.requested_plan === 'pro' && "text-blue-400",
                                request.requested_plan === 'starter' && "text-gray-400"
                              )}>
                                {request.requested_plan?.toUpperCase()}
                              </span>
                            </p>
                            <span className={clsx(
                              "px-2 py-1 rounded text-xs font-medium capitalize",
                              request.status === 'pending' && "bg-yellow-500/20 text-yellow-400",
                              request.status === 'approved' && "bg-green-500/20 text-green-400",
                              request.status === 'declined' && "bg-red-500/20 text-red-400"
                            )}>
                              {request.status}
                            </span>
                          </div>

                          {request.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprove(request.id)}
                                disabled={processing === request.id}
                                className="p-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-colors disabled:opacity-50"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDecline(request.id)}
                                disabled={processing === request.id}
                                className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors disabled:opacity-50"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {request.payment_proof && (
                        <div className="mt-4 p-4 bg-dark-200/50 rounded-xl">
                          <p className="text-sm text-gray-400 mb-2">Payment Proof:</p>
                          <img 
                            src={request.payment_proof} 
                            alt="Payment proof" 
                            className="max-w-xs rounded-lg"
                          />
                        </div>
                      )}

                      {request.admin_notes && (
                        <div className="mt-4 p-4 bg-dark-200/50 rounded-xl">
                          <p className="text-sm text-gray-400">Admin Notes:</p>
                          <p className="text-white">{request.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, prefix = '' }) {
  const colors = {
    green: { bg: 'bg-green-500/10', icon: 'from-green-500 to-green-600', text: 'text-green-400' },
    blue: { bg: 'bg-blue-500/10', icon: 'from-blue-500 to-blue-600', text: 'text-blue-400' },
    yellow: { bg: 'bg-yellow-500/10', icon: 'from-yellow-500 to-yellow-600', text: 'text-yellow-400' },
    purple: { bg: 'bg-purple-500/10', icon: 'from-purple-500 to-purple-600', text: 'text-purple-400' },
  };
  
  const c = colors[color] || colors.blue;

  return (
    <div className="glass-card p-5 border border-gray-800 hover-lift animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={clsx("p-3 rounded-xl bg-gradient-to-br shadow-lg", c.icon)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}