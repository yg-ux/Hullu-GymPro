import { useState, useEffect, useRef, useCallback } from 'react';
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
  Plus,
  ArrowRight,
  UserPlus,
  PieChart,
  Activity,
  Zap,
  Award,
  ChevronRight,
  CheckCircle,
  Dumbbell,
  Radio,
} from 'lucide-react';
import clsx from 'clsx';
import PageHint from '../components/PageHint';

// Color theme mapping
const COLOR_THEMES = {
  default: { iconBg: 'bg-blue-500/15', iconColor: 'text-blue-400', nameColor: 'text-blue-400', accent: 'blue', primary: 'blue-500' },
  emerald: { iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400', nameColor: 'text-emerald-400', accent: 'emerald', primary: 'emerald-500' },
  purple: { iconBg: 'bg-purple-500/15', iconColor: 'text-purple-400', nameColor: 'text-purple-400', accent: 'purple', primary: 'purple-500' },
  red: { iconBg: 'bg-red-500/15', iconColor: 'text-red-400', nameColor: 'text-red-400', accent: 'red', primary: 'red-500' },
  amber: { iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400', nameColor: 'text-amber-400', accent: 'amber', primary: 'amber-500' },
  cyan: { iconBg: 'bg-cyan-500/15', iconColor: 'text-cyan-400', nameColor: 'text-cyan-400', accent: 'cyan', primary: 'cyan-500' },
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
  const { gym, user } = useAuth();
  const userRole = user?.role || 'owner';
  const canSeeRevenue = ['owner', 'admin', 'manager'].includes(userRole);
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [liveAttendance, setLiveAttendance] = useState(null);

  useEffect(() => {
    loadStats();
    loadActivities();
    loadLiveAttendance();
    const interval = setInterval(loadLiveAttendance, 30000);
    return () => clearInterval(interval);
  }, []);


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
          title: t('dashboard.expiringMemberships', { count: stats.overview.expiring_soon }),
          time: new Date().toISOString(),
          timeAgo: t('dashboard.todayWord')
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
      const feed = await api.get('/stats/activity');

      const TYPE_CONFIG = {
        check_in:   { icon: UserCheck,  color: 'from-gym-400 to-gym-500',       dot: 'from-gym-400 to-gym-500' },
        new_member: { icon: UserPlus,   color: 'from-purple-500 to-purple-600',  dot: 'from-purple-400 to-purple-600' },
        payment:    { icon: DollarSign, color: 'from-emerald-500 to-emerald-600', dot: 'from-emerald-400 to-emerald-600' },
      };

      const activityItems = feed
        .filter(item => canSeeRevenue || item.type !== 'payment')
        .map(item => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.check_in;
          let title = '';
          if (item.type === 'check_in')   title = t('dashboard.checkedIn', { name: item.customer_name });
          if (item.type === 'new_member') title = t('dashboard.newMember', { name: item.customer_name });
          if (item.type === 'payment')    title = t('dashboard.paymentReceived', { amount: formatCurrency(item.amount) });
          return {
            id: `${item.type}-${item.id}`,
            icon: cfg.icon,
            color: cfg.color,
            dot: cfg.dot,
            type: item.type,
            title,
            subtitle: item.type === 'payment' ? item.customer_name : null,
            timeAgo: getTimeAgo(item.event_time),
            time: item.event_time,
          };
        });

      setActivities(activityItems);
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

    if (diffMins < 1) return t('dashboard.justNow');
    if (diffMins < 60) return t(diffMins > 1 ? 'dashboard.minsAgo' : 'dashboard.minAgo', { n: diffMins });
    if (diffHours < 24) return t(diffHours > 1 ? 'dashboard.hoursAgo' : 'dashboard.hourAgo', { n: diffHours });
    if (diffDays < 7) return t(diffDays > 1 ? 'dashboard.daysAgo' : 'dashboard.dayAgo', { n: diffDays });
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

  // Get theme colors
  const theme = COLOR_THEMES[gym?.color_theme] || COLOR_THEMES.default;
  
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHint id="dashboard">
        Stat cards show today's check-ins, active members, expiring memberships, and this month's revenue. If any memberships expire within 7 days an alert appears — click it to go to the Retention page and send renewal reminders. The revenue chart tracks your last 6 months of income so you can spot trends at a glance. The activity feed at the bottom shows the latest check-ins, new members, and payments — use it as your daily opening routine.
      </PageHint>
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
            <div className={`w-14 h-14 rounded-2xl ${theme.iconBg} flex items-center justify-center`}>
              <Dumbbell className={`w-8 h-8 ${theme.iconColor}`} />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-400 mb-0.5">
              {stats?.overview?.total_customers === 0 ? t('dashboard.welcome') : t('dashboard.welcomeBack')}
            </p>
            <h1 className={`text-3xl font-bold ${theme.nameColor} leading-tight`}>
              {gym?.name || t('dashboard.yourGym')}
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              {stats?.overview?.total_customers === 0
                ? t('dashboard.getStarted')
                : t('dashboard.todayAt', { gym: gym?.name || t('dashboard.yourGym') })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/customers" className="btn-secondary inline-flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('dashboard.viewAllCustomers')}
          </Link>
          <Link to="/customers/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {t('dashboard.addCustomer')}
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
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t('dashboard.inGymRightNow')}</p>
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
                      <span className="text-xs text-gray-500">{t('dashboard.morePeople', { count: liveAttendance.count - 5 })}</span>
                    )}
                  </div>
                )}
                {liveAttendance.count === 0 && (
                  <span className="text-sm text-gray-600">{t('dashboard.gymIsEmpty')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <AnimatedStatCard
          title={t('dashboard.totalCustomers')}
          value={stats?.overview?.total_customers || 0}
          icon={Users}
          color="blue"
          trend={t('dashboard.thisMonthShort', { count: stats?.new_this_month || 0 })}
          animated={animated}
          delay={0}
        />
        <AnimatedStatCard
          title={t('dashboard.activeMembers')}
          value={stats?.overview?.active_customers || 0}
          icon={UserCheck}
          color="green"
          trend={t('dashboard.activeRate', { rate: activeRate })}
          animated={animated}
          delay={100}
        />
        <AnimatedStatCard
          title={t('dashboard.expiringSoon')}
          value={stats?.overview?.expiring_soon || 0}
          icon={Clock}
          color="yellow"
          trend={t('dashboard.within7Days')}
          animated={animated}
          delay={200}
        />
        <AnimatedStatCard
          title={t('dashboard.expired')}
          value={stats?.overview?.expired || 0}
          icon={AlertTriangle}
          color="red"
          trend={t('dashboard.needRenewal')}
          animated={animated}
          delay={300}
        />
      </div>

      {/* Expiring Members Widget */}
      <ExpiringMembersWidget />

      {/* Inactive Members Alert */}
      <InactiveMembersWidget />


      {/* Membership Distribution & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Membership Distribution */}
        {stats?.membership_distribution && stats.membership_distribution.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-gym-400" />
              {t('dashboard.activeMemberships')}
            </h2>
            <AnimatedPieChart data={stats.membership_distribution} animated={animated} />
          </div>
        )}

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            {t('dashboard.quickActions')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/customers/new"
              className="flex flex-col items-center gap-2 p-4 bg-gym-500/10 rounded-xl border border-gym-500/25 hover:border-gym-500/50 hover:bg-gym-500/15 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-gym-500/25 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-gym-400" />
              </div>
              <span className="text-sm text-gray-300">{t('dashboard.addCustomer')}</span>
            </Link>
            <Link
              to="/customers?status=expiring"
              className="flex flex-col items-center gap-2 p-4 bg-amber-500/10 rounded-xl border border-amber-500/25 hover:border-amber-500/50 hover:bg-amber-500/15 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/25 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-sm text-gray-300">{t('dashboard.expiringSoon')}</span>
            </Link>
            <Link
              to="/customers"
              className="flex flex-col items-center gap-2 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/25 hover:border-emerald-500/50 hover:bg-emerald-500/15 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/25 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm text-gray-300">{t('dashboard.checkIn')}</span>
            </Link>
            <Link
              to="/subscription"
              className="flex flex-col items-center gap-2 p-4 bg-dark-300/80 rounded-xl border border-gray-700/60 hover:border-gym-500/40 hover:bg-gym-500/10 transition-all hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-700/50 flex items-center justify-center">
                <Award className="w-5 h-5 text-gray-300" />
              </div>
              <span className="text-sm text-gray-400">{t('dashboard.upgradePlan')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div>
        <div className="glass-card p-6 flex flex-col max-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-gym-400" />
              {t('dashboard.activityFeed')}
            </h2>
            <span className="text-xs text-gray-500 bg-dark-200 px-2.5 py-1 rounded-full">
              Today · {activities.length} events
            </span>
          </div>

          {/* Legend */}
          {!activitiesLoading && activities.length > 0 && (
            <div className="flex items-center gap-4 mb-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gym-400 inline-block" />Check-ins</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />New Members</span>
              {canSeeRevenue && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Payments</span>}
            </div>
          )}

          <div className="relative flex-1 min-h-0 overflow-y-auto pr-1">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gym-500 via-gym-400/30 to-transparent pointer-events-none" />

            {activitiesLoading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center gap-3 pl-10 animate-pulse">
                    <div className="absolute left-3 w-4 h-4 rounded-full bg-dark-300" />
                    <div className="flex-1 h-12 bg-dark-200/50 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-2">
                {activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="relative flex items-center gap-3 pl-10 animate-slide-up"
                    style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                  >
                    {/* Timeline dot */}
                    <div className={clsx(
                      'absolute left-3 w-4 h-4 rounded-full bg-gradient-to-br border-2 border-dark-100 shadow-md flex-shrink-0',
                      activity.dot
                    )} />

                    <div className="flex-1 flex items-center gap-3 px-3 py-2.5 bg-dark-200/40 hover:bg-dark-200/80 rounded-xl transition-colors">
                      {/* Icon */}
                      <div className={clsx('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', activity.color)}>
                        <activity.icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate leading-tight">{activity.title}</p>
                        {activity.subtitle && (
                          <p className="text-xs text-gray-500 truncate">{activity.subtitle}</p>
                        )}
                      </div>
                      {/* Time */}
                      <span className="text-[11px] text-gray-500 flex-shrink-0">{activity.timeAgo}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-dark-200 flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-7 h-7 text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm">{t('dashboard.noRecentActivity')}</p>
                <p className="text-gray-600 text-xs mt-1">No check-ins or new sign-ups today yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Section — membership expiry summary */}
      {(stats?.overview?.expiring_soon > 0 || stats?.overview?.expired > 0) && (
        <div className="glass-card p-5 border border-amber-500/20 relative overflow-hidden">
          <div className="relative flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-1.5">{t('dashboard.attentionRequired')}</h3>
              <div className="space-y-1">
                {stats.overview.expiring_soon > 0 && (
                  <p className="text-sm text-gray-400">
                    <span className="text-amber-400 font-semibold">{t('dashboard.membersExpireIn7', { count: stats.overview.expiring_soon })}</span>
                    {t('dashboard.expireWithin7')}
                  </p>
                )}
                {stats.overview.expired > 0 && (
                  <p className="text-sm text-gray-400">
                    <span className="text-red-400 font-semibold">{t('dashboard.membersExpireIn7', { count: stats.overview.expired })}</span>
                    {t('dashboard.haveExpired')}
                  </p>
                )}
              </div>
              <Link
                to="/customers?status=expiring"
                className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-medium rounded-lg hover:bg-amber-500/25 transition-all"
              >
                {t('dashboard.viewAffected')}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Developer credit */}
      <div className="pt-2 pb-1 text-center">
        <a
          href="https://aleqatech.million-designers.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Developed by <span className="font-medium text-gray-500 hover:text-gray-300 transition-colors">Aleqa Tech</span>
        </a>
      </div>
    </div>
  );
}

// ── Expiring Members Widget ───────────────────────────────────────────────
function ExpiringMembersWidget() {
  const { t } = useLanguage();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/customers?status=expiring&limit=10&sortBy=membership_end').then(data => {
      const list = data?.customers || data?.data || (Array.isArray(data) ? data : []);
      setMembers(list);
    }).catch(() => setMembers([])).finally(() => setLoading(false));
  }, []);

  if (loading) return null; // silent load — only show when data arrives
  if (members.length === 0) return null; // nothing to show — all good!

  const getDaysLeft = (end) => {
    if (!end) return null;
    const diff = Math.ceil((new Date(end) - Date.now()) / 86400000);
    return diff;
  };

  return (
    <div className="glass-card p-5 border border-amber-500/25">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{t('dashboard.expiringWidget')}</h3>
            <p className="text-xs text-gray-500">{t('dashboard.expiringWidgetSub')}</p>
          </div>
        </div>
        <Link
          to="/customers?status=expiring"
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
        >
          {t('dashboard.expiringViewAll')}
        </Link>
      </div>

      <div className="space-y-2">
        {members.slice(0, 6).map(m => {
          const days = getDaysLeft(m.membership_end);
          const isToday = days === 0;
          const isUrgent = days !== null && days <= 1;
          return (
            <Link
              key={m.id}
              to={`/customers/${m.id}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-dark-200/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                {m.photo ? (
                  <img src={m.photo} alt={m.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-dark-300 flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-400">
                    {m.name?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-gym-300 transition-colors">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.phone || ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                  isToday ? 'bg-red-500/20 text-red-400' :
                  isUrgent ? 'bg-orange-500/20 text-orange-400' :
                  'bg-amber-500/15 text-amber-400'
                }`}>
                  {isToday ? t('dashboard.expiringToday')
                    : days === 1 ? t('dashboard.expiringDayLeft')
                    : t('dashboard.expiringDaysLeft', { n: days })}
                </span>
                <Link
                  to={`/customers/${m.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs text-gym-400 hover:text-gym-300 px-2 py-1 rounded-lg hover:bg-gym-500/10 transition-colors font-medium"
                >
                  {t('dashboard.expiringRenew')}
                </Link>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Inactive Members Widget ──────────────────────────────────────────────────
function InactiveMembersWidget() {
  const { t } = useLanguage();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  useEffect(() => {
    setLoading(true);
    api.get(`/customers/inactive-alert?days=${days}`)
      .then(data => setMembers(data.members || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return null;
  if (members.length === 0) return null;

  return (
    <div className="glass-card p-5 border border-blue-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{t('dashboard.inactiveTitle')}</h3>
            <p className="text-xs text-gray-500">{t('dashboard.inactiveSub', { n: days })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={e => setDays(parseInt(e.target.value))}
            className="text-xs bg-dark-200 border border-gray-700 text-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-gym-500"
          >
            <option value={7}>{t('dashboard.inactive7')}</option>
            <option value={14}>{t('dashboard.inactive14')}</option>
            <option value={30}>{t('dashboard.inactive30')}</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {members.slice(0, 6).map(m => (
          <Link
            key={m.id}
            to={`/customers/${m.id}`}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-dark-200/60 transition-colors group"
          >
            <div className="flex items-center gap-3">
              {m.photo ? (
                <img src={m.photo} alt={m.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-dark-300 flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-400">
                  {m.name?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-white group-hover:text-gym-300 transition-colors">{m.name}</p>
                <p className="text-xs text-gray-500">{m.phone || ''}</p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 font-semibold">
              {m.days_since_visit != null
                ? t('dashboard.inactiveDays', { n: m.days_since_visit })
                : t('dashboard.inactiveNever')}
            </span>
          </Link>
        ))}
      </div>

      {members.length > 6 && (
        <Link
          to="/customers?status=active"
          className="block mt-3 text-center text-xs text-blue-400 hover:text-blue-300 transition-colors py-2"
        >
          {t('dashboard.inactiveViewAll', { n: members.length })}
        </Link>
      )}
    </div>
  );
}

// Smooth HSL gradient: green (120°) → yellow (60°) → orange (30°) → red (0°)

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

// Parse "2026-06" → { short: "Jun", long: "June 2026" } — uses browser locale
function parseMonthLabel(str, locale = 'default') {
  if (!str) return { short: '', long: str || '' };
  const parts = str.split('-');
  if (parts.length >= 2) {
    const idx = parseInt(parts[1], 10) - 1;
    if (idx >= 0 && idx < 12) {
      const d = new Date(parseInt(parts[0], 10), idx, 1);
      const short = d.toLocaleDateString(locale, { month: 'short' });
      const long  = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      return { short, long };
    }
  }
  return { short: str, long: str };
}

function AnimatedBarChart({ data, animated }) {
  const { t, lang } = useLanguage();
  const locale = lang === 'am' ? 'am-ET' : 'en-US';
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        {t('dashboard.noDataYet')}
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
        const { short, long } = parseMonthLabel(month.month || month.label || '', locale);

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
  // pg returns COUNT(*) as string (bigint) — parse to int before arithmetic
  const total = data.reduce((sum, item) => sum + parseInt(item.count, 10), 0);
  const colors = ['from-gym-500 to-gym-600', 'from-gym-400 to-gym-500', 'from-emerald-500 to-emerald-600', 'from-gym-300 to-gym-400', 'from-amber-500 to-amber-600'];
  const textColors = ['text-gym-400', 'text-gym-300', 'text-emerald-400', 'text-gym-200', 'text-amber-400'];

  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const count = parseInt(item.count, 10);
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        
        return (
          <div key={item.membership_type} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex justify-between text-sm mb-2">
              <span className={textColors[index % textColors.length]}>{getMembershipLabel(item.membership_type)}</span>
              <span className="text-gray-400">{count} ({percentage}%)</span>
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