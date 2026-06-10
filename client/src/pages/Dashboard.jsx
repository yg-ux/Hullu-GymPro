import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatCurrency, getMembershipLabel, getPaymentMethodLabel } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { StatCardSkeleton } from '../components/Skeleton';
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
  Dumbbell,
  Radio,
  LogIn as KioskIcon
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
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [liveAttendance, setLiveAttendance] = useState(null);
  const [heatmap, setHeatmap] = useState(null);

  useEffect(() => {
    loadStats();
    loadActivities();
    loadLiveAttendance();
    loadHeatmap();
    const interval = setInterval(loadLiveAttendance, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHeatmap = async () => {
    try {
      const data = await api.get('/attendance/heatmap?days=30');
      setHeatmap(data);
    } catch (e) {
      console.warn('Failed to load heatmap:', e);
    }
  };

  const loadLiveAttendance = async () => {
    try {
      const data = await api.get('/attendance/current');
      setLiveAttendance(data);
    } catch (e) {
      console.warn('Failed to load live attendance:', e);
    }
  };

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
          color: 'from-amber-500 to-amber-600',
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
            color: 'from-gym-500 to-gym-600',
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
            color: 'from-emerald-500 to-emerald-600',
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
            color: 'from-gym-400 to-gym-500',
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
      <div className="space-y-6 animate-fade-in">
        <div className="h-10 w-64 bg-gray-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-gray-800 rounded-2xl animate-pulse" />
          <div className="h-64 bg-gray-800 rounded-2xl animate-pulse" />
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
            <p className="text-sm font-medium text-gray-400 mb-0.5">
              {stats?.overview?.total_customers === 0 ? 'Welcome!' : 'Welcome back!'}
            </p>
            <h1 className={`text-3xl font-bold bg-gradient-to-r from-${theme.accent}-400 to-${theme.accent}-500 bg-clip-text text-transparent leading-tight`}>
              {gym?.name || 'Your Gym'}
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              {stats?.overview?.total_customers === 0
                ? "Let's get started — add your first member!"
                : `Here's what's happening at ${gym?.name || 'your gym'} today.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/customers" className="btn-secondary inline-flex items-center gap-2">
            <Users className="w-4 h-4" />
            View All Customers
          </Link>
          <Link to="/customers/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Customer
          </Link>
        </div>
      </div>

      {/* Live "In Gym Now" banner */}
      {liveAttendance !== null && (
        <div className="glass-card px-5 py-4 flex items-center justify-between gap-4 border border-gym-500/20">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gym-500/20 flex items-center justify-center">
                <Radio className="w-5 h-5 text-gym-400" />
              </div>
              {liveAttendance.count > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-dark-100 animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">In Gym Right Now</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-2xl font-bold text-white">{liveAttendance.count ?? 0}</span>
                {liveAttendance.count > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {(liveAttendance.currently_present || []).slice(0, 5).map((a, i) => (
                      <span key={a.id} className="text-xs text-gray-400 bg-dark-300 px-2 py-0.5 rounded-full">
                        {a.customer_name?.split(' ')[0]}
                      </span>
                    ))}
                    {liveAttendance.count > 5 && (
                      <span className="text-xs text-gray-500">+{liveAttendance.count - 5} more</span>
                    )}
                  </div>
                )}
                {liveAttendance.count === 0 && (
                  <span className="text-sm text-gray-600">Gym is empty</span>
                )}
              </div>
            </div>
          </div>
          <Link
            to="/kiosk"
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gym-500/15 border border-gym-500/30 rounded-xl text-gym-400 text-sm font-medium hover:bg-gym-500/25 transition-all"
          >
            <KioskIcon className="w-4 h-4" />
            Kiosk
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <AnimatedStatCard
          title={t('dashboard.totalCustomers')}
          value={stats?.overview?.total_customers || 0}
          icon={Users}
          color="blue"
          trend={`+${stats?.new_this_month || 0} this month`}
          animated={animated}
          delay={0}
        />
        <AnimatedStatCard
          title={t('dashboard.activeMembers')}
          value={stats?.overview?.active_customers || 0}
          icon={UserCheck}
          color="green"
          trend={`${activeRate}% active rate`}
          animated={animated}
          delay={100}
        />
        <AnimatedStatCard
          title={t('dashboard.expiringSoon')}
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
                  <div className="w-10 h-10 rounded-xl bg-gym-500/20 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-gym-400" />
                  </div>
                  Revenue Overview
                </h2>
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
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
                  animated={animated}
                  delay={0}
                />
                <AnimatedRevenueCard
                  title="This Month"
                  value={stats?.revenue?.this_month || 0}
                  icon={Activity}
                  animated={animated}
                  delay={100}
                />
                <AnimatedRevenueCard
                  title="Last 30 Days"
                  value={stats?.revenue?.last_30_days || 0}
                  icon={TrendingUp}
                  animated={animated}
                  delay={200}
                />
                <AnimatedRevenueCard
                  title="All Time"
                  value={stats?.revenue?.all_time || 0}
                  icon={Wallet}
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
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Latest Payment</span>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gym-500/25 flex items-center justify-center text-lg font-bold text-gym-300">
                    {customerOfDay.customer_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{customerOfDay.customer_name}</h3>
                    <p className="text-sm text-gray-400">Just made a payment</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/25">
                  <span className="text-sm text-gray-400">Amount Paid</span>
                  <span className="text-xl font-bold text-emerald-400">
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
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-dark-300/60 rounded-xl border border-gray-800/60 hover-lift">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gym-500/15 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-gym-400" />
                  </div>
                  <span className="text-gray-400 text-sm">Total Revenue</span>
                </div>
                <span className="text-lg font-bold text-white">
                  {formatCurrency(stats?.revenue?.all_time || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-300/60 rounded-xl border border-gray-800/60 hover-lift">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gym-500/15 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-gym-400" />
                  </div>
                  <span className="text-gray-400 text-sm">Total Payments</span>
                </div>
                <span className="text-lg font-bold text-white">
                  {stats?.revenue?.all_time_count || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-300/60 rounded-xl border border-gray-800/60 hover-lift">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gym-500/15 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-gym-400" />
                  </div>
                  <span className="text-gray-400 text-sm">New This Month</span>
                </div>
                <span className="text-lg font-bold text-gym-400">
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
                const maxCount = Math.max(...stats.payment_methods.map(m => m.count));
                const percentage = maxCount > 0 ? (method.count / maxCount) * 100 : 0;

                return (
                  <div key={method.payment_method} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">{getPaymentMethodLabel(method.payment_method)}</span>
                      <span className="text-gray-400">{method.count} payments • {formatCurrency(method.total)}</span>
                    </div>
                    <div className="h-2.5 bg-dark-300 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-gym-500 to-gym-400"
                        style={{
                          width: animated ? `${percentage}%` : '0%',
                          transitionDelay: `${index * 200}ms`,
                          opacity: 1 - index * 0.2
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
              className="flex flex-col items-center gap-2 p-4 bg-gym-500/10 rounded-xl border border-gym-500/25 hover:border-gym-500/50 hover:bg-gym-500/15 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-gym-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserPlus className="w-5 h-5 text-gym-400" />
              </div>
              <span className="text-sm text-gray-300">Add Customer</span>
            </Link>
            <Link
              to="/customers?status=expiring"
              className="flex flex-col items-center gap-2 p-4 bg-amber-500/10 rounded-xl border border-amber-500/25 hover:border-amber-500/50 hover:bg-amber-500/15 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-sm text-gray-300">Expiring Soon</span>
            </Link>
            <Link
              to="/customers"
              className="flex flex-col items-center gap-2 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/25 hover:border-emerald-500/50 hover:bg-emerald-500/15 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm text-gray-300">Check-in</span>
            </Link>
            <Link
              to="/subscription"
              className="flex flex-col items-center gap-2 p-4 bg-dark-300/80 rounded-xl border border-gray-700/60 hover:border-gym-500/40 hover:bg-gym-500/10 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-700/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5 text-gray-300" />
              </div>
              <span className="text-sm text-gray-400">Upgrade Plan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Attendance Heatmap */}
      {heatmap && heatmap.max > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-400" />
              {t('dashboard.heatmap')}
            </h2>
            <span className="text-xs text-gray-500">{t('dashboard.last30Days', { days: heatmap.days })}</span>
          </div>
          <AttendanceHeatmap matrix={heatmap.matrix} max={heatmap.max} />
        </div>
      )}

      {/* Recent Payments with Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-400" />
              {t('dashboard.recentPayments')}
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
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{payment.customer_name}</p>
                      <p className="text-xs text-gray-500">{formatDate(payment.payment_date)}</p>
                    </div>
                  </div>
                  <span className="text-base font-bold text-emerald-400">
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
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gym-500 via-gym-400/40 to-transparent" />
            
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
        <div className="glass-card p-5 border border-amber-500/20 relative overflow-hidden">
          <div className="relative flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-1.5">Attention Required</h3>
              <div className="space-y-1">
                {stats.overview.expiring_soon > 0 && (
                  <p className="text-sm text-gray-400">
                    <span className="text-amber-400 font-semibold">{stats.overview.expiring_soon} members</span>
                    {' '}expire within 7 days
                  </p>
                )}
                {stats.overview.expired > 0 && (
                  <p className="text-sm text-gray-400">
                    <span className="text-red-400 font-semibold">{stats.overview.expired} members</span>
                    {' '}have expired memberships
                  </p>
                )}
              </div>
              <Link
                to="/customers?status=expiring"
                className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-medium rounded-lg hover:bg-amber-500/25 transition-all"
              >
                View affected customers
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceHeatmap({ matrix, max }) {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21];

  const cellColor = (v) => {
    if (v === 0) return 'rgba(255,255,255,0.04)';
    const intensity = Math.min(v / max, 1);
    const alpha = 0.15 + intensity * 0.75;
    return `rgba(var(--gym-500-rgb), ${alpha})`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Hour labels */}
        <div className="flex pl-10 mb-1.5">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 min-w-[18px] text-center text-[10px] text-gray-500">
              {hourLabels.includes(h) ? (h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`) : ''}
            </div>
          ))}
        </div>
        {/* Grid rows */}
        {matrix.map((row, d) => (
          <div key={d} className="flex items-center mb-1">
            <div className="w-10 text-xs text-gray-400 font-medium pr-2">{dayLabels[d]}</div>
            {row.map((v, h) => (
              <div
                key={h}
                title={`${dayLabels[d]} ${h}:00 — ${v} check-ins`}
                className="flex-1 min-w-[18px] aspect-square mx-[1px] rounded-[3px] transition-transform hover:scale-125 cursor-pointer"
                style={{ background: cellColor(v) }}
              />
            ))}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-gray-500">
          <span>Less</span>
          {[0.04, 0.2, 0.4, 0.6, 0.9].map((a, i) => (
            <div key={i} className="w-3 h-3 rounded-[3px]" style={{ background: a === 0.04 ? 'rgba(255,255,255,0.04)' : `rgba(var(--gym-500-rgb), ${a})` }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function AnimatedStatCard({ title, value, icon: Icon, color, trend, animated, delay }) {
  const { count, ref } = useAnimatedCounter(value, 1500, delay);

  // Semantic trend-text colours only — icon is always gym-brand
  const trendColor = {
    blue:   'text-gray-500',
    green:  'text-emerald-500',
    yellow: 'text-amber-500',
    red:    'text-red-500',
  }[color] || 'text-gray-500';

  return (
    <div
      ref={ref}
      className={clsx(
        "glass-card p-5 border border-gray-800/60 transition-all duration-500 hover-lift",
        animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-white">{count}</p>
          {trend && (
            <p className={clsx("text-xs mt-1.5 font-medium", trendColor)}>{trend}</p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-gym-500/20 shadow-md">
          <Icon className="w-6 h-6 text-gym-400" />
        </div>
      </div>
    </div>
  );
}

function AnimatedRevenueCard({ title, value, icon: Icon, animated, delay }) {
  const { count, ref } = useAnimatedCounter(value, 1500, delay);

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
        <div className="p-1.5 rounded-lg bg-gym-500/20">
          <Icon className="w-3 h-3 text-gym-400" />
        </div>
        <span className="text-xs text-gray-400">{title}</span>
      </div>
      <p className="text-xl font-bold text-white">{formatCurrency(count)}</p>
    </div>
  );
}

// Parse "2026-06" → { short: "Jun", long: "June 2026" }
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function parseMonthLabel(str) {
  if (!str) return { short: '', long: str || '' };
  const parts = str.split('-');
  if (parts.length >= 2) {
    const idx = parseInt(parts[1], 10) - 1;
    if (idx >= 0 && idx < 12) {
      return { short: MONTH_SHORT[idx], long: `${MONTH_NAMES[idx]} ${parts[0]}` };
    }
  }
  return { short: str, long: str };
}

function AnimatedBarChart({ data, animated }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        No data yet
      </div>
    );
  }

  // SVG dimensions
  const VW = 800, VH = 240;
  const pad = { top: 60, right: 12, bottom: 38, left: 52 };
  const innerW = VW - pad.left - pad.right;
  const innerH = VH - pad.top - pad.bottom;

  const maxVal = Math.max(...data.map(d => d.total), 1);
  const GRID = 3;

  const slotW = innerW / data.length;
  const barW = Math.min(slotW * 0.55, 42);
  const xOf = (i) => pad.left + slotW * i + slotW / 2;

  const fmtY = (v) => {
    if (v === 0) return '0';
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return Math.round(v).toString();
  };

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="dbBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--gym-500-rgb))" stopOpacity="1" />
          <stop offset="100%" stopColor="rgb(var(--gym-700-rgb))" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="dbBarLast" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--gym-400-rgb))" />
          <stop offset="100%" stopColor="rgb(var(--gym-600-rgb))" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="dbBarHov" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--gym-300-rgb))" />
          <stop offset="100%" stopColor="rgb(var(--gym-500-rgb))" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Grid lines + Y labels */}
      {Array.from({ length: GRID + 1 }, (_, i) => {
        const frac = i / GRID;
        const val = maxVal * (1 - frac);
        const y = pad.top + innerH * frac;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={VW - pad.right} y2={y}
              stroke={i === GRID ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}
              strokeWidth={i === GRID ? 1.5 : 1}
              strokeDasharray={i === GRID ? 'none' : '4 4'} />
            <text x={pad.left - 8} y={y + 4} textAnchor="end"
              fill="#4b5563" fontSize="11" fontFamily="ui-sans-serif, system-ui, sans-serif">
              {fmtY(val)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((month, i) => {
        const cx = xOf(i);
        const barH = animated ? Math.max((month.total / maxVal) * innerH, month.total > 0 ? 3 : 0) : 0;
        const barY = pad.top + innerH - barH;
        const isLast = i === data.length - 1;
        const isHov = hoveredIdx === i;
        const fillId = isHov ? 'url(#dbBarHov)' : isLast ? 'url(#dbBarLast)' : 'url(#dbBarGrad)';
        const { short, long } = parseMonthLabel(month.month || month.label || '');

        // Tooltip — compact, always above bar, clamped to top of SVG
        const TW = 96, TH = 30;
        const tipX = Math.min(Math.max(cx - TW / 2, pad.left), VW - pad.right - TW);
        const tipY = Math.max(barY - TH - 8, 2);
        const caretX = Math.min(Math.max(cx, tipX + 8), tipX + TW - 8);

        return (
          <g key={month.month || i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Full-column hover zone */}
            <rect x={cx - slotW / 2} y={pad.top} width={slotW} height={innerH} fill="transparent" />

            {/* Bar */}
            <rect x={cx - barW / 2} y={barY} width={barW} height={barH}
              rx={5} ry={5} fill={fillId}
              opacity={isHov || isLast ? 1 : 0.6}
              style={{
                transition: `y 0.7s cubic-bezier(.22,.68,0,1.2) ${i * 50}ms,
                             height 0.7s cubic-bezier(.22,.68,0,1.2) ${i * 50}ms,
                             fill 0.2s, opacity 0.2s`
              }}
            />

            {/* Shine strip on bar top */}
            {barH > 8 && (
              <rect x={cx - barW / 2 + 4} y={barY + 3} width={barW - 8} height={3}
                rx={2} fill="rgba(255,255,255,0.28)"
                style={{ transition: `y 0.7s cubic-bezier(.22,.68,0,1.2) ${i * 50}ms` }} />
            )}

            {/* X-axis label — abbreviated month name */}
            <text x={cx} y={VH - pad.bottom + 18} textAnchor="middle"
              fill={isHov || isLast ? '#9ca3af' : '#374151'}
              fontSize={data.length > 10 ? 9 : 11}
              fontFamily="ui-sans-serif, system-ui, sans-serif">
              {short}
            </text>

            {/* Tooltip — always above bar, caret points down */}
            {isHov && (
              <g>
                <rect x={tipX + 1} y={tipY + 1} width={TW} height={TH} rx={8} fill="rgba(0,0,0,0.3)" />
                <rect x={tipX} y={tipY} width={TW} height={TH} rx={8}
                  fill="rgba(15,23,42,0.97)" stroke="rgb(var(--gym-500-rgb) / 0.45)" strokeWidth="1" />
                <text x={tipX + TW / 2} y={tipY + 12} textAnchor="middle"
                  fill="rgb(var(--gym-400-rgb))" fontSize="7.5" fontWeight="500" letterSpacing="0.4"
                  fontFamily="ui-sans-serif, system-ui, sans-serif">
                  {long.toUpperCase()}
                </text>
                <text x={tipX + TW / 2} y={tipY + 25} textAnchor="middle"
                  fill="white" fontSize="9.5" fontWeight="700"
                  fontFamily="ui-sans-serif, system-ui, sans-serif">
                  ETB {(month.total || 0).toLocaleString()}
                </text>
                {/* Caret always points down toward bar */}
                <path d={`M${caretX - 5},${tipY + TH} L${caretX},${tipY + TH + 5} L${caretX + 5},${tipY + TH}`}
                  fill="rgba(15,23,42,0.97)" stroke="rgb(var(--gym-500-rgb) / 0.45)" strokeWidth="1" strokeLinejoin="round" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function AnimatedPieChart({ data, animated }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const colors = ['from-gym-500 to-gym-600', 'from-gym-400 to-gym-500', 'from-emerald-500 to-emerald-600', 'from-gym-300 to-gym-400', 'from-amber-500 to-amber-600'];
  const textColors = ['text-gym-400', 'text-gym-300', 'text-emerald-400', 'text-gym-200', 'text-amber-400'];
  
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