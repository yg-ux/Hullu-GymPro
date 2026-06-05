import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatCurrency, getMembershipLabel } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserCheck, 
  Clock, 
  AlertTriangle,
  DollarSign, 
  TrendingUp,
  Plus,
  ArrowRight,
  CreditCard,
  UserPlus,
  TrendingDown,
  PieChart,
  Activity,
  Wallet,
  Receipt,
  Calendar,
  Star,
  Zap,
  Target,
  Award,
  ChevronRight,
  CheckCircle,
  Dumbbell
} from 'lucide-react';
import clsx from 'clsx';

// Color theme mapping
const COLOR_THEMES = {
  default: { gradient: 'from-blue-500 to-blue-700', accent: 'blue', primary: 'blue-500' },
  emerald: { gradient: 'from-emerald-500 to-emerald-700', accent: 'emerald', primary: 'emerald-500' },
  purple: { gradient: 'from-purple-500 to-purple-700', accent: 'purple', primary: 'purple-500' },
  red: { gradient: 'from-red-500 to-red-700', accent: 'red', primary: 'red-500' },
  amber: { gradient: 'from-amber-500 to-amber-700', accent: 'amber', primary: 'amber-500' },
  cyan: { gradient: 'from-cyan-500 to-cyan-700', accent: 'cyan', primary: 'cyan-500' },
};

// Animated Counter Hook
function useAnimatedCounter(endValue, duration = 1000, delay = 0) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    const timeout = setTimeout(() => {
      let startTime = null;
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeOutQuart * endValue));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isVisible, endValue, duration, delay]);

  return { count, ref };
}

export default function Dashboard() {
  const { gym } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadActivities();
  }, []);

  useEffect(() => {
    if (stats) {
      setTimeout(() => setAnimated(true), 100);
    }
  }, [stats]);

  // Update activities when stats load (for expiring info)
  useEffect(() => {
    if (stats && activities.length > 0) {
      const existingExpiring = activities.find(a => a.type === 'expiring');
      if (stats.overview?.expiring_soon > 0 && !existingExpiring) {
        setActivities(prev => [...prev, {
          id: 'expiring',
          icon: Clock,
          color: 'from-yellow-500 to-orange-500',
          type: 'expiring',
          title: `${stats.overview.expiring_soon} memberships expiring soon`,
          time: new Date().toISOString(),
          timeAgo: 'Today'
        }]);
      }
    }
  }, [stats, activities.length]);

  const loadStats = async () => {
    try {
      const data = await api.get('/stats/dashboard');
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const [customersRes, paymentsRes, attendanceRes] = await Promise.allSettled([
        api.get('/customers?limit=5&sort=created_at'),
        api.get('/payments?limit=5'),
        api.get('/attendance/today')
      ]);

      const activityItems = [];

      // Process recent customers
      if (customersRes.status === 'fulfilled' && customersRes.value?.customers) {
        customersRes.value.customers.slice(0, 3).forEach(customer => {
          activityItems.push({
            id: `customer-${customer.id}`,
            icon: UserPlus,
            color: 'from-blue-500 to-cyan-500',
            type: 'new_member',
            title: `New member: ${customer.name}`,
            time: customer.created_at,
            timeAgo: getTimeAgo(customer.created_at)
          });
        });
      }

      // Process recent payments
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value?.payments) {
        paymentsRes.value.payments.slice(0, 3).forEach(payment => {
          activityItems.push({
            id: `payment-${payment.id}`,
            icon: DollarSign,
            color: 'from-green-500 to-emerald-500',
            type: 'payment',
            title: `Payment received: ${formatCurrency(payment.amount)}`,
            time: payment.payment_date,
            timeAgo: getTimeAgo(payment.payment_date),
            customer: payment.customer_name
          });
        });
      }

      // Process today's attendance/check-ins
      if (attendanceRes.status === 'fulfilled' && attendanceRes.value) {
        const allAttendance = [
          ...(attendanceRes.value.currently_present || []),
          ...(attendanceRes.value.checked_out || [])
        ];
        allAttendance.slice(0, 3).forEach(record => {
          activityItems.push({
            id: `checkin-${record.id}`,
            icon: UserCheck,
            color: 'from-purple-500 to-pink-500',
            type: 'check_in',
            title: `${record.customer_name} checked in`,
            time: record.check_in,
            timeAgo: getTimeAgo(record.check_in)
          });
        });
      }

      // Sort by time, most recent first
      activityItems.sort((a, b) => new Date(b.time) - new Date(a.time));

      setActivities(activityItems.slice(0, 8)); // Limit to 8 most recent activities
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateStr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-gym-600/30 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-gym-500 border-t-transparent animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const activeRate = stats?.overview?.total_customers > 0
    ? Math.round((stats.overview.active_customers / stats.overview.total_customers) * 100)
    : 0;

  // Customer of the day (random active customer with recent check-in)
  const customerOfDay = stats?.recent_payments?.[0];

  // Get theme colors
  const theme = COLOR_THEMES[gym?.color_theme] || COLOR_THEMES.default;
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Gym Logo */}
          {gym?.logo ? (
            <img 
              src={gym.logo} 
              alt={gym.name} 
              className="w-14 h-14 rounded-2xl object-cover border-2 shadow-lg"
              style={{ borderColor: `var(--${theme.accent}-500, #3b82f6)` }}
            />
          ) : (
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-lg`}>
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome back! <span className={`bg-gradient-to-r from-${theme.accent}-400 to-${theme.accent}-500 bg-clip-text text-transparent`}>{gym?.name || 'Hullu Gyms'}</span>
            </h1>
            <p className="text-gray-400 mt-1">Here's what's happening at {gym?.name || 'your gym'} today.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/customers" className="btn-secondary inline-flex items-center gap-2">
            <Users className="w-4 h-4" />
            View All Customers
          </Link>
          <Link to="/customers/new" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all" style={{ backgroundImage: `linear-gradient(to right, var(--${theme.accent}-500, #3b82f6), var(--${theme.accent}-600, #2563eb))` }}>
            <Plus className="w-5 h-5" />
            Add Customer
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <AnimatedStatCard
          title="Total Members"
          value={stats?.overview?.total_customers || 0}
          icon={Users}
          color="blue"
          trend={`+${stats?.new_this_month || 0} this month`}
          animated={animated}
          delay={0}
        />
        <AnimatedStatCard
          title="Active Members"
          value={stats?.overview?.active_customers || 0}
          icon={UserCheck}
          color="green"
          trend={`${activeRate}% active rate`}
          animated={animated}
          delay={100}
        />
        <AnimatedStatCard
          title="Expiring Soon"
          value={stats?.overview?.expiring_soon || 0}
          icon={Clock}
          color="yellow"
          trend="Within 7 days"
          animated={animated}
          delay={200}
        />
        <AnimatedStatCard
          title="Expired"
          value={stats?.overview?.expired || 0}
          icon={AlertTriangle}
          color="red"
          trend="Need renewal"
          animated={animated}
          delay={300}
        />
      </div>

      {/* Revenue Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Card */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6 overflow-hidden relative">
            <div className="absolute inset-0 gradient-hero opacity-50" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  Revenue Overview
                </h2>
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">+12.5%</span>
                </div>
              </div>

              {/* Revenue Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <AnimatedRevenueCard
                  title="Today"
                  value={stats?.revenue?.today || 0}
                  icon={Calendar}
                  color="emerald"
                  animated={animated}
                  delay={0}
                />
                <AnimatedRevenueCard
                  title="This Month"
                  value={stats?.revenue?.this_month || 0}
                  icon={Activity}
                  color="blue"
                  animated={animated}
                  delay={100}
                />
                <AnimatedRevenueCard
                  title="Last 30 Days"
                  value={stats?.revenue?.last_30_days || 0}
                  icon={TrendingUp}
                  color="purple"
                  animated={animated}
                  delay={200}
                />
                <AnimatedRevenueCard
                  title="All Time"
                  value={stats?.revenue?.all_time || 0}
                  icon={Wallet}
                  color="gym"
                  animated={animated}
                  delay={300}
                />
              </div>

              {/* Bar Chart */}
              {stats?.monthly_trend && stats.monthly_trend.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Monthly Revenue (Last 12 Months)
                  </h3>
                  <AnimatedBarChart data={stats.monthly_trend} animated={animated} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Customer of the Day */}
          {customerOfDay && (
            <div className="glass-card p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">Customer of the Day</span>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-xl font-bold shadow-lg shadow-amber-500/30">
                    {customerOfDay.customer_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{customerOfDay.customer_name}</h3>
                    <p className="text-sm text-gray-400">Just made a payment</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/20 to-transparent rounded-xl border border-green-500/30">
                  <span className="text-sm text-gray-300">Amount Paid</span>
                  <span className="text-xl font-bold text-green-400">
                    +{formatCurrency(customerOfDay.amount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* All Time Stats */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-gym-400" />
              Quick Stats
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-transparent rounded-xl border border-green-500/20 hover-lift">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-gray-300">Total Revenue</span>
                </div>
                <span className="text-xl font-bold text-green-400">
                  {formatCurrency(stats?.revenue?.all_time || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-transparent rounded-xl border border-blue-500/20 hover-lift">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-gray-300">Total Payments</span>
                </div>
                <span className="text-xl font-bold text-blue-400">
                  {stats?.revenue?.all_time_count || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-transparent rounded-xl border border-purple-500/20 hover-lift">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-gray-300">New This Month</span>
                </div>
                <span className="text-xl font-bold text-purple-400">
                  +{stats?.new_this_month || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Distribution & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Membership Distribution */}
        {stats?.membership_distribution && stats.membership_distribution.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-gym-400" />
              Active Memberships
            </h2>
            <AnimatedPieChart data={stats.membership_distribution} animated={animated} />
          </div>
        )}

        {/* Payment Methods */}
        {stats?.payment_methods && stats.payment_methods.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-gray-400" />
              Payment Methods
            </h2>
            <div className="space-y-4">
              {stats.payment_methods.map((method, index) => {
                const colors = ['from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-cyan-500 to-teal-500'];
                const maxCount = Math.max(...stats.payment_methods.map(m => m.count));
                const percentage = maxCount > 0 ? (method.count / maxCount) * 100 : 0;
                
                return (
                  <div key={method.payment_method} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300 capitalize">{method.payment_method.replace('_', ' ')}</span>
                      <span className="text-gray-400">{method.count} payments • {formatCurrency(method.total)}</span>
                    </div>
                    <div className="h-3 bg-dark-300 rounded-full overflow-hidden">
                      <div 
                        className={clsx("h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r", colors[index % colors.length])}
                        style={{ 
                          width: animated ? `${percentage}%` : '0%',
                          transitionDelay: `${index * 200}ms`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link 
              to="/customers/new" 
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-gym-500/20 to-purple-500/20 rounded-xl border border-gym-500/30 hover:border-gym-500/50 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gym-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-gray-300">Add Customer</span>
            </Link>
            <Link 
              to="/customers?status=expiring" 
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30 hover:border-yellow-500/50 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-gray-300">Expiring Soon</span>
            </Link>
            <Link 
              to="/customers" 
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30 hover:border-green-500/50 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-gray-300">Check-in</span>
            </Link>
            <Link 
              to="/subscription" 
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-gray-300">Upgrade Plan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Payments with Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-400" />
              Recent Payments
            </h2>
            <Link to="/customers" className="text-sm text-gym-400 hover:text-gym-300 flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {stats?.recent_payments?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_payments.map((payment, index) => (
                <div 
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-dark-200/50 rounded-xl hover:bg-dark-200 transition-all animate-slide-up hover-lift"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{payment.customer_name}</p>
                      <p className="text-xs text-gray-400">{formatDate(payment.payment_date)}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-green-400">
                    +{formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-dark-200 flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-500">No payments recorded yet</p>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-gym-400" />
              Activity Feed
            </h2>
          </div>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gym-500 via-purple-500 to-transparent" />
            
            {activitiesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-4 pl-10 animate-pulse">
                    <div className="absolute left-3 w-4 h-4 rounded-full bg-dark-300" />
                    <div className="flex-1 p-3 bg-dark-200/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-dark-300" />
                        <div>
                          <div className="h-4 bg-dark-300 rounded w-32 mb-1" />
                          <div className="h-3 bg-dark-300 rounded w-16" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div 
                    key={activity.id}
                    className="relative flex items-start gap-4 pl-10 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Timeline dot */}
                    <div className={clsx(
                      "absolute left-3 w-4 h-4 rounded-full bg-gradient-to-br border-2 border-dark-100 shadow-lg",
                      activity.color
                    )} />
                    
                    <div className="flex-1 p-3 bg-dark-200/50 rounded-xl hover:bg-dark-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", activity.color)}>
                          <activity.icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-white">{activity.title}</p>
                          <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-dark-200 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {(stats?.overview?.expiring_soon > 0 || stats?.overview?.expired > 0) && (
        <div className="glass-card p-6 border border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 relative overflow-hidden">
          <div className="absolute inset-0 card-pattern-dots opacity-30" />
          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0 animate-pulse-glow">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-2">Attention Required</h3>
              <div className="space-y-2">
                {stats.overview.expiring_soon > 0 && (
                  <p className="text-gray-300">
                    <span className="text-yellow-400 font-bold">{stats.overview.expiring_soon} members</span> 
                    {' '}will expire within 7 days
                  </p>
                )}
                {stats.overview.expired > 0 && (
                  <p className="text-gray-300">
                    <span className="text-red-400 font-bold">{stats.overview.expired} members</span> 
                    {' '}have expired memberships
                  </p>
                )}
              </div>
              <Link 
                to="/customers?status=expiring" 
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-medium rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg"
              >
                <span className="text-sm">View affected customers</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnimatedStatCard({ title, value, icon: Icon, color, trend, animated, delay }) {
  const { count, ref } = useAnimatedCounter(value, 1500, delay);
  
  const colors = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', icon: 'from-blue-500 to-blue-600' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', icon: 'from-green-500 to-green-600' },
    yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: 'from-yellow-500 to-yellow-600' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', icon: 'from-red-500 to-red-600' },
  };
  
  const c = colors[color] || colors.blue;

  return (
    <div 
      ref={ref}
      className={clsx(
        "glass-card p-5 border transition-all duration-500 hover-lift",
        c.border,
        animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{count}</p>
          {trend && (
            <p className="text-xs text-gray-500 mt-1">{trend}</p>
          )}
        </div>
        <div className={clsx("p-3 rounded-xl bg-gradient-to-br shadow-lg", c.icon)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function AnimatedRevenueCard({ title, value, icon: Icon, color, animated, delay }) {
  const { count, ref } = useAnimatedCounter(value, 1500, delay);
  const colors = {
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    gym: 'from-gym-500 to-gym-600',
  };
  
  const colorClasses = colors[color] || colors.gym;

  return (
    <div 
      ref={ref}
      className={clsx(
        "p-4 bg-dark-200/50 rounded-xl border border-gray-800/50 transition-all duration-500 hover-lift",
        animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={clsx("p-1.5 rounded-lg bg-gradient-to-br", colorClasses)}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs text-gray-400">{title}</span>
      </div>
      <p className="text-xl font-bold text-white">{formatCurrency(count)}</p>
    </div>
  );
}

function AnimatedBarChart({ data, animated }) {
  const maxValue = Math.max(...data.map(d => d.total));
  
  return (
    <div className="h-48 flex items-end gap-1">
      {data.map((month, index) => {
        const height = maxValue > 0 ? (month.total / maxValue) * 100 : 0;
        const isCurrentMonth = index === data.length - 1;
        
        return (
          <div 
            key={month.month} 
            className="flex-1 flex flex-col items-center gap-2 group"
          >
            <div className="w-full flex flex-col items-center justify-end h-36">
              <div 
                className={clsx(
                  "w-full rounded-t-lg transition-all duration-1000 ease-out cursor-pointer relative",
                  isCurrentMonth 
                    ? "bg-gradient-to-t from-gym-600 via-gym-500 to-gym-400 shadow-lg shadow-gym-500/40" 
                    : "bg-gradient-to-t from-gray-600 to-gray-500 group-hover:from-gray-500 group-hover:to-gray-400"
                )}
                style={{ 
                  height: animated ? `${Math.max(height, 5)}%` : '0%',
                  transitionDelay: `${index * 100}ms`
                }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity glass-card px-3 py-2 shadow-xl whitespace-nowrap z-10">
                  <p className="text-xs text-gray-400">{month.month}</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(month.total)}</p>
                  <p className="text-xs text-gray-400">{month.count} payments</p>
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-500">{month.month.split('-')[1]}</span>
          </div>
        );
      })}
    </div>
  );
}

function AnimatedPieChart({ data, animated }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const colors = ['from-gym-500 to-purple-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-yellow-500 to-orange-500', 'from-red-500 to-rose-500'];
  const textColors = ['text-gym-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400', 'text-red-400'];
  
  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
        
        return (
          <div key={item.membership_type} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex justify-between text-sm mb-2">
              <span className={textColors[index % textColors.length]}>{getMembershipLabel(item.membership_type)}</span>
              <span className="text-gray-400">{item.count} ({percentage}%)</span>
            </div>
            <div className="h-4 bg-dark-200 rounded-full overflow-hidden flex">
              <div 
                className={clsx("h-full transition-all duration-1000 bg-gradient-to-r", colors[index % colors.length])}
                style={{ 
                  width: animated ? `${percentage}%` : '0%',
                  transitionDelay: `${index * 100}ms`
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}