import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import SubscriptionExpiredModal from './SubscriptionExpiredModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api, formatCurrency } from '../utils/api';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Crown,
  AlertTriangle,
  CreditCard,
  Settings,
  LogIn,
  LogOut as LogOutIcon,
  Bell,
  DollarSign,
  UserPlus,
  Clock,
  Activity,
  Lock,
  BarChart3,
  UserCog,
  TrendingUp,
  Zap,
  Search,
  Receipt,
  Wrench,
  UserMinus,
} from 'lucide-react';
import clsx from 'clsx';

// Plan requirements: free < starter < pro
const PLAN_ORDER = ['free', 'starter', 'pro'];

// Which roles can see each page (owner always has full access)
const ALL_ROLES = ['owner', 'admin', 'manager', 'trainer', 'receptionist'];
const navigation = [
  { name: 'Dashboard',  i18n: 'nav.dashboard', href: '/dashboard',    icon: LayoutDashboard, roles: ['owner','admin','manager','trainer'] },
  { name: 'Customers',  i18n: 'nav.customers', href: '/customers',    icon: Users,           roles: ['owner','admin','manager','trainer','receptionist'] },
  { name: 'Check In',   i18n: 'nav.checkIn',   href: '/check-in',     icon: LogIn,           roles: ALL_ROLES },
  { name: 'Check Out',  i18n: 'nav.checkOut',  href: '/check-out',    icon: LogOutIcon,      roles: ALL_ROLES },
  { name: 'Staff',      i18n: 'nav.staff',     href: '/staff',        icon: UserCog,         roles: ['owner','admin','manager'], requiresPlan: 'starter' },
  { name: 'Reports',    i18n: 'nav.reports',   href: '/reports',      icon: BarChart3,       roles: ['owner','admin','manager'], requiresPlan: 'pro' },
  { name: 'Revenue',    i18n: 'nav.revenue',   href: '/revenue',      icon: TrendingUp,      roles: ['owner','admin','manager'], requiresPlan: 'pro' },
  { name: 'Follow Up',  i18n: 'nav.retention', href: '/retention',    icon: UserMinus,       roles: ['owner','admin','manager'], requiresPlan: 'pro' },
  { name: 'Expenses',   i18n: 'nav.expenses',  href: '/expenses',     icon: Receipt,         roles: ['owner','admin','manager'], requiresPlan: 'pro' },
  { name: 'Equipment',  i18n: 'nav.equipment', href: '/equipment',    icon: Wrench,          roles: ['owner','admin','manager'], requiresPlan: 'pro' },
  { name: 'Analytics',  i18n: 'nav.analytics', href: '/attendance-analytics', icon: Activity, roles: ['owner','admin','manager'] },
  { name: 'Settings',   i18n: 'nav.settings',  href: '/settings',     icon: Settings,        roles: ['owner','admin'] },
];

// Role display config
const ROLE_CONFIG = {
  owner:        { label: 'Owner',        color: 'text-gym-400    bg-gym-500/20' },
  admin:        { label: 'Admin',        color: 'text-purple-400 bg-purple-500/20' },
  manager:      { label: 'Manager',      color: 'text-blue-400   bg-blue-500/20' },
  trainer:      { label: 'Trainer',      color: 'text-green-400  bg-green-500/20' },
  receptionist: { label: 'Receptionist', color: 'text-yellow-400 bg-yellow-500/20' },
};

export default function Layout() {
  const { user, gym, subscription, logout } = useAuth();
  const { t } = useLanguage();
  const userRole = user?.role || 'owner';
  const roleConfig = ROLE_CONFIG[userRole] || ROLE_CONFIG.owner;
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const searchContainerRef = useRef(null);
  // Track which notification IDs the user has already seen (persisted across reloads)
  const seenIdsRef  = useRef(new Set(JSON.parse(localStorage.getItem('notif_seen') || '[]')));
  const notifOpenRef = useRef(false);
  // Apply color theme CSS variables
  useEffect(() => {
    const colorTheme = gym?.color_theme || 'default';
    const themeScales = {
      default:   { r300:'125 211 252', r400:'56 189 248',  r500:'14 165 233',  r600:'2 132 199',   r700:'3 105 161'  },
      indigo:    { r300:'165 180 252', r400:'129 140 248', r500:'99 102 241',  r600:'79 70 229',   r700:'67 56 202'  },
      purple:    { r300:'216 180 254', r400:'192 132 252', r500:'168 85 247',  r600:'147 51 234',  r700:'126 34 206' },
      rose:      { r300:'253 164 175', r400:'251 113 133', r500:'244 63 94',   r600:'225 29 72',   r700:'190 18 60'  },
      red:       { r300:'252 165 165', r400:'248 113 113', r500:'239 68 68',   r600:'220 38 38',   r700:'185 28 28'  },
      amber:     { r300:'252 211 77',  r400:'251 191 36',  r500:'245 158 11',  r600:'217 119 6',   r700:'180 83 9'   },
      lime:      { r300:'190 242 100', r400:'163 230 53',  r500:'132 204 22',  r600:'101 163 13',  r700:'77 124 15'  },
      emerald:   { r300:'110 231 183', r400:'52 211 153',  r500:'16 185 129',  r600:'5 150 105',   r700:'4 120 87'   },
      teal:      { r300:'94 234 212',  r400:'45 212 191',  r500:'20 184 166',  r600:'13 148 136',  r700:'15 118 110' },
      gold:      { r300:'253 224 71',  r400:'250 204 21',  r500:'234 179 8',   r600:'161 98 7',    r700:'133 77 14'  },
      chocolate: { r300:'214 162 101', r400:'180 120 60',  r500:'146 64 14',   r600:'120 53 15',   r700:'92 40 10'   },
      slate:     { r300:'148 163 184', r400:'100 116 139', r500:'71 85 105',   r600:'51 65 85',    r700:'30 41 59'   },
    };
    const s = themeScales[colorTheme] || themeScales.default;
    document.documentElement.style.setProperty('--gym-300-rgb', s.r300);
    document.documentElement.style.setProperty('--gym-400-rgb', s.r400);
    document.documentElement.style.setProperty('--gym-500-rgb', s.r500);
    document.documentElement.style.setProperty('--gym-600-rgb', s.r600);
    document.documentElement.style.setProperty('--gym-700-rgb', s.r700);

  }, [gym?.color_theme]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Global search keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(s => !s);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // Debounced live search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); setSelectedIndex(-1); return; }
    clearTimeout(searchDebounceRef.current);
    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const data = await api.get(`/customers?search=${encodeURIComponent(q)}&limit=6`);
        setSearchResults(data.data || []);
        setSelectedIndex(-1);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 250);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const closeSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
    setSelectedIndex(-1);
    setSearchOpen(false);
  };

  const goToCustomer = (id) => {
    navigate(`/customers/${id}`);
    closeSearch();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (selectedIndex >= 0 && searchResults[selectedIndex]) {
      goToCustomer(searchResults[selectedIndex].id);
      return;
    }
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/customers?search=${encodeURIComponent(q)}`);
    closeSearch();
  };

  const handleSearchKeyDown = (e) => {
    if (!searchResults.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, searchResults.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, -1)); }
  };

  const showDropdown = searchFocused && searchQuery.trim().length > 0;
  const statusColor = (s) => s === 'active' ? 'bg-green-500' : s === 'expiring' ? 'bg-yellow-500' : 'bg-red-500';

  const isFreePlan = !gym?.subscription_plan || gym?.subscription_plan === 'free';
  const showTrialBanner      = subscription?.status === 'trial' && (subscription?.daysLeft ?? 0) > 0;
  const showGraceBanner      = subscription?.status === 'grace';
  const showSubscriptionAlert = subscription && !subscription.valid && !isFreePlan;
  const showFreePlanBanner = isFreePlan && !showGraceBanner && !showSubscriptionAlert && !showTrialBanner;

  // ── Admin broadcast banner ───────────────────────────────────────────────────
  const [broadcast, setBroadcast] = useState(null);
  const [broadcastDismissed, setBroadcastDismissed] = useState(false);

  useEffect(() => {
    api.get('/admin/broadcast')
      .then(data => { if (data) setBroadcast(data); })
      .catch(() => {}); // silently ignore — non-critical
  }, []);

  // ── Real-time notifications ──────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [gymCount, setGymCount] = useState(0);

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    // Date-only string (YYYY-MM-DD) — compare by calendar day, not milliseconds
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const today     = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (dateStr === today)     return t('layout.todayWord');
      if (dateStr === yesterday) return t('layout.yesterday');
      const diffDays = Math.floor((Date.now() - new Date(dateStr + 'T00:00:00Z')) / 86400000);
      return t('layout.dAgo', { n: diffDays });
    }
    // Full timestamp — normalise to ISO UTC so all browsers parse it correctly
    // Replace PostgreSQL space separator with T, then add Z if no timezone present
    const iso = dateStr.replace(' ', 'T');
    const normalized = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z';
    const diff = Date.now() - new Date(normalized).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return t('layout.justNow');
    if (m < 60) return t('layout.mAgo', { n: m });
    if (h < 24) return t('layout.hAgo', { n: h });
    return t('layout.dAgo', { n: d });
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const [paymentsRes, attendanceRes, statsRes] = await Promise.allSettled([
        api.get('/payments?limit=5'),
        api.get('/attendance/today'),
        api.get('/stats/dashboard'),
      ]);

      const items = [];

      // Recent payments
      const payments = paymentsRes.status === 'fulfilled'
        ? (paymentsRes.value?.data || paymentsRes.value?.payments || [])
        : [];
      payments.slice(0, 3).forEach(p => {
        items.push({
          id: `pay-${p.id}`,
          type: 'payment',
          icon: DollarSign,
          iconColor: 'text-emerald-400',
          iconBg: 'bg-emerald-500/15',
          msgKey: 'layout.paymentMsg',
          msgVars: { name: p.customer_name, amount: formatCurrency(p.amount) },
          time: p.created_at || p.payment_date,
        });
      });

      // Live gym occupancy count for sidebar badge
      setGymCount(
        attendanceRes.status === 'fulfilled'
          ? (attendanceRes.value?.currently_present || []).length
          : 0
      );

      // Today's check-ins (currently present first, then checked-out)
      if (attendanceRes.status === 'fulfilled' && attendanceRes.value) {
        const allToday = [
          ...(attendanceRes.value.currently_present || []),
          ...(attendanceRes.value.checked_out || []),
        ];
        allToday.slice(0, 3).forEach(a => {
          items.push({
            id: `ci-${a.id}`,
            type: 'checkin',
            icon: UserPlus,
            iconColor: 'text-gym-400',
            iconBg: 'bg-gym-500/15',
            msgKey: 'layout.checkInMsg',
            msgVars: { name: a.customer_name },
            time: a.check_in,
          });
        });
      }

      // Expiring soon alert
      const expiring = statsRes.status === 'fulfilled'
        ? (statsRes.value?.overview?.expiring_soon || 0)
        : 0;
      if (expiring > 0) {
        items.push({
          id: 'expiry',
          type: 'expiry',
          icon: Clock,
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-500/15',
          msgKey: expiring > 1 ? 'layout.expiryMsgPlural' : 'layout.expiryMsg',
          msgVars: { count: expiring },
          time: null,
        });
      }

      // Sort by time, most recent first; timeless items (expiry) go last
      items.sort((a, b) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return new Date(b.time) - new Date(a.time);
      });

      const newItems = items.slice(0, 8);
      setNotifications(newItems);
      setRecentActivity(items.slice(0, 3));
      // Count only notifications the user hasn't seen yet
      const unseenCount = newItems.filter(n => !seenIdsRef.current.has(n.id)).length;
      if (notifOpenRef.current) {
        // Panel is open — mark everything seen immediately
        const ids = newItems.map(n => n.id);
        seenIdsRef.current = new Set(ids);
        localStorage.setItem('notif_seen', JSON.stringify(ids));
        setNotifUnread(0);
      } else {
        setNotifUnread(unseenCount);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 60 seconds while the page is open
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Fast-poll gym occupancy every 10 seconds for the sidebar badge
  useEffect(() => {
    const fetchCount = () => {
      api.get('/attendance/current')
        .then(data => setGymCount((data.currently_present || []).length))
        .catch(() => {});
    };
    fetchCount(); // immediate on mount
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const getPlanBadgeClass = (plan) => {
    switch (plan?.toLowerCase()) {
      case 'enterprise':
        return 'plan-enterprise';
      case 'pro':
        return 'plan-pro';
      default:
        return 'plan-starter';
    }
  };

  const broadcastColors = {
    info:    { bar: 'from-blue-500/10 to-blue-600/10 border-blue-500/30', icon: 'text-blue-400', text: 'text-blue-200' },
    warning: { bar: 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30', icon: 'text-yellow-400', text: 'text-yellow-200' },
    success: { bar: 'from-green-500/10 to-emerald-500/10 border-green-500/30', icon: 'text-green-400', text: 'text-green-200' },
  };

  return (
    <div className="min-h-screen bg-dark-200">
      {/* Admin Broadcast Banner */}
      {broadcast && !broadcastDismissed && (
        <div className={`bg-gradient-to-r ${(broadcastColors[broadcast.type] || broadcastColors.info).bar} border-b px-4 py-2`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className={`flex items-center gap-2 text-sm ${(broadcastColors[broadcast.type] || broadcastColors.info).text}`}>
              <Bell className={`w-4 h-4 flex-shrink-0 ${(broadcastColors[broadcast.type] || broadcastColors.info).icon}`} />
              <span>{broadcast.message}</span>
            </div>
            <button
              onClick={() => setBroadcastDismissed(true)}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Demo mode banner */}
      {gym?.slug?.startsWith('demo-') && (
        <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-b border-amber-500/30 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-300 text-sm">
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <span className="font-semibold text-white">You're in demo mode</span>
                {' '}— explore freely. This session expires in 3 hours.{' '}
                <button
                  onClick={() => { window.location.href = '/'; }}
                  className="underline text-amber-400 hover:text-amber-300 font-medium"
                >
                  Create your free account →
                </button>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Trial Countdown Banner — shown on every page when in trial */}
      {showTrialBanner && (
        <div
          className={clsx(
            'border-b px-4 py-2 cursor-pointer',
            subscription.daysLeft <= 3
              ? 'bg-red-500/10 border-red-500/30'
              : subscription.daysLeft <= 7
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-gym-500/10 border-gym-500/25'
          )}
          onClick={() => navigate('/subscription')}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className={clsx('flex items-center gap-2 text-sm',
              subscription.daysLeft <= 3 ? 'text-red-300'
              : subscription.daysLeft <= 7 ? 'text-amber-300'
              : 'text-gym-300'
            )}>
              <Crown className="w-4 h-4 flex-shrink-0" />
              <span>
                {subscription.daysLeft <= 1
                  ? 'Last day of your free trial — subscribe now to keep access'
                  : `Free trial: ${subscription.daysLeft} day${subscription.daysLeft !== 1 ? 's' : ''} remaining`}
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/subscription'); }}
              className={clsx(
                'flex-shrink-0 px-3 py-1 text-white text-xs font-semibold rounded-lg transition-all shadow-md',
                subscription.daysLeft <= 3 ? 'bg-red-500 hover:bg-red-400'
                : subscription.daysLeft <= 7 ? 'bg-amber-500 hover:bg-amber-400'
                : 'bg-gym-500 hover:bg-gym-400'
              )}
            >
              Choose a Plan
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Banner — for legacy accounts without a paid plan */}
      {showFreePlanBanner && (
        <div className="bg-gradient-to-r from-gym-500/8 to-purple-500/8 border-b border-gym-500/20 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gym-300 text-sm">
              <Crown className="w-4 h-4 text-gym-400 flex-shrink-0" />
              <span>Unlock unlimited members, SMS, reports &amp; more — upgrade to a paid plan</span>
            </div>
            <button
              onClick={() => navigate('/subscription')}
              className="flex-shrink-0 px-3 py-1 bg-gradient-to-r from-gym-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-gym-400 hover:to-purple-500 transition-all shadow-md"
            >
              View Plans
            </button>
          </div>
        </div>
      )}

      {/* Grace Period Banner — subscription expired but within 5-day grace window */}
      {showGraceBanner && (
        <div className="bg-orange-500/10 border-b border-orange-500/40 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{t('layout.graceWarning', { n: subscription.graceDaysLeft })}</span>
            </div>
            <button
              onClick={() => navigate('/subscription')}
              className="px-4 py-1 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
            >
              {t('layout.renewNow')}
            </button>
          </div>
        </div>
      )}

      {/* Expired Subscription Alert Banner */}
      {showSubscriptionAlert && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {subscription.status === 'trial_expired'
                  ? t('layout.trialEnded')
                  : t('layout.subExpired')}
              </span>
            </div>
            <button
              onClick={() => navigate('/subscription')}
              className="px-4 py-1 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-medium rounded-lg transition-colors"
            >
              {t('layout.subscribeNow')}
            </button>
          </div>
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={clsx(
        "fixed inset-0 z-50 lg:hidden transition-opacity duration-300",
        sidebarOpen ? "visible opacity-100" : "invisible opacity-0"
      )}>
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        <div className={clsx(
          "absolute left-0 top-0 h-full w-72 bg-dark-100 border-r border-gray-800 transition-transform duration-300 overflow-y-auto overflow-x-hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-end p-3 border-b border-gray-800/50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <SidebarContent onNavigate={() => setSidebarOpen(false)} recentActivity={recentActivity} getTimeAgo={getTimeAgo} gymCount={gymCount} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent recentActivity={recentActivity} getTimeAgo={getTimeAgo} gymCount={gymCount} />
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-dark-200/80 backdrop-blur-xl border-b border-gray-800/50">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-100 transition-all"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Global Search — desktop inline, mobile icon only */}
            <div ref={searchContainerRef} className="hidden sm:block relative">
              <form onSubmit={handleSearchSubmit} className="flex items-center relative">
                {searchLoading
                  ? <div className="absolute left-3 w-4 h-4 border-2 border-gym-500/60 border-t-transparent rounded-full animate-spin" />
                  : <Search className="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none" />
                }
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t('layout.searchPlaceholder')}
                  className="w-48 lg:w-64 pl-9 pr-14 py-2 bg-dark-100 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gym-500/60 focus:w-72 transition-all duration-300"
                />
                {searchQuery
                  ? <button type="button" onClick={closeSearch} className="absolute right-3 text-gray-500 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
                  : <kbd className="absolute right-3 text-[10px] text-gray-600 font-mono bg-dark-300/60 rounded px-1.5 py-0.5 border border-gray-800">⌘K</kbd>
                }
              </form>

              {/* Live results dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-dark-100 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[320px]">
                  {searchResults.length > 0 ? (
                    <>
                      <div className="px-3 py-2 border-b border-gray-800/60 text-[10px] text-gray-500 uppercase tracking-wider">
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                      </div>
                      {searchResults.map((c, i) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => goToCustomer(c.id)}
                          className={clsx(
                            'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                            i === selectedIndex ? 'bg-gym-500/15' : 'hover:bg-dark-200/60'
                          )}
                        >
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gym-500 to-gym-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {c.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{c.name}</p>
                            <p className="text-xs text-gray-500 truncate">{c.phone || '—'}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={clsx('w-1.5 h-1.5 rounded-full', statusColor(c.status))} />
                            <span className="text-[11px] text-gray-500 capitalize">{c.status}</span>
                          </div>
                        </button>
                      ))}
                      <button
                        type="button"
                        onMouseDown={handleSearchSubmit}
                        className="w-full px-3 py-2 text-xs text-gym-400 hover:text-gym-300 hover:bg-dark-200/40 border-t border-gray-800/60 text-center transition-colors"
                      >
                        See all results for "{searchQuery}"
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      {searchLoading ? 'Searching…' : `No customers found for "${searchQuery}"`}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto sm:ml-3">
              {/* Mobile Search Toggle */}
              <button
                onClick={() => { setSearchOpen(s => !s); }}
                className="sm:hidden p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-dark-100 transition-all"
                title={t('layout.searchPlaceholder')}
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    const opening = !notifOpen;
                    setNotifOpen(opening);
                    notifOpenRef.current = opening;
                    if (opening) {
                      // Mark all currently visible notifications as seen
                      setNotifUnread(0);
                      const ids = notifications.map(n => n.id);
                      seenIdsRef.current = new Set(ids);
                      localStorage.setItem('notif_seen', JSON.stringify(ids));
                    }
                  }}
                  className="relative p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-dark-100 transition-all duration-300"
                >
                  <Bell className="w-5 h-5" />
                  {notifUnread > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none">
                      {notifUnread > 9 ? '9+' : notifUnread}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => { setNotifOpen(false); notifOpenRef.current = false; }}
                    />
                    <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-[60px] sm:top-auto sm:mt-2 sm:w-80 glass-card shadow-xl z-20 overflow-hidden animate-slide-down">
                      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="font-semibold text-white">{t('layout.notifications')}</h3>
                        {!notifLoading && (
                          <span className="text-xs text-gray-400 bg-dark-300 px-2 py-1 rounded-full">
                            {t('layout.recent', { count: notifications.length })}
                          </span>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifLoading ? (
                          <div className="space-y-1 p-2">
                            {[1,2,3].map(i => (
                              <div key={i} className="flex items-center gap-3 px-2 py-3 animate-pulse">
                                <div className="w-9 h-9 rounded-xl bg-dark-300 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                  <div className="h-3 bg-dark-300 rounded w-4/5" />
                                  <div className="h-2.5 bg-dark-300 rounded w-1/3" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="py-10 text-center text-sm text-gray-500">
                            {t('layout.noRecentActivity')}
                          </div>
                        ) : (
                          notifications.map(notif => (
                            <div
                              key={notif.id}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-dark-200/50 transition-colors border-b border-gray-800/40 last:border-0"
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.iconBg}`}>
                                <notif.icon className={`w-4 h-4 ${notif.iconColor}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white leading-snug">{t(notif.msgKey, notif.msgVars)}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {notif.time ? getTimeAgo(notif.time) : t('layout.todayWord')}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="px-4 py-2.5 bg-dark-100/50 border-t border-gray-800">
                        <button
                          onClick={() => { fetchNotifications(); setNotifOpen(false); notifOpenRef.current = false; }}
                          className="w-full text-xs text-gym-400 hover:text-gym-300 transition-colors"
                        >
                          {t('layout.refresh')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Subscription Badge with Plan Tier Colors */}
              <button
                onClick={() => navigate('/subscription')}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300",
                  subscription?.valid && subscription?.status !== 'grace'
                    ? "bg-green-500/10 hover:bg-green-500/20 text-green-400"
                    : subscription?.status === 'grace'
                      ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400"
                      : "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                )}
              >
                {subscription?.valid && subscription?.status !== 'grace' ? (
                  <Crown className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {!subscription?.valid
                    ? (subscription?.status === 'trial_expired'
                        ? t('layout.trialExpiredBadge')
                        : t('layout.expired'))
                    : subscription?.status === 'grace'
                      ? t('layout.graceBadge')
                      : subscription?.status === 'trial'
                        ? t('layout.freeTrial')
                        : gym?.subscription_plan || t('layout.starter')}
                </span>
                {subscription?.valid && subscription?.status !== 'grace' && subscription?.daysLeft > 0 && (
                  <span className="hidden sm:inline text-xs opacity-70">
                    ({t('layout.daysShort', { n: subscription.daysLeft })})
                  </span>
                )}
              </button>

              {/* Plan Badge (Tier Colors) — only shown when subscription is valid */}
              {subscription?.valid && subscription?.status !== 'grace' && (
                <span className={clsx(
                  "hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                  getPlanBadgeClass(gym?.subscription_plan)
                )}>
                  {gym?.subscription_plan || 'Starter'}
                </span>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 p-2 text-gray-300 hover:text-white rounded-xl hover:bg-dark-100 transition-all duration-300"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gym-500 via-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-gym-500/30">
                    {gym?.name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'G'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{gym?.name || user?.username}</span>
                  <ChevronDown className={clsx(
                    "w-4 h-4 transition-transform duration-300",
                    userMenuOpen && "rotate-180"
                  )} />
                </button>

                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setUserMenuOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-64 glass-card shadow-xl z-20 overflow-hidden animate-scale-in">
                      <div className="px-4 py-4 border-b border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gym-500/15 flex items-center justify-center text-lg font-bold text-gym-400">
                            {gym?.name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'G'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{gym?.name}</p>
                            <p className="text-xs text-gray-400">{user?.username}</p>
                            <span className={clsx('inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium', roleConfig.color)}>
                              {t(`role.${userRole}`)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="py-2">
                        {(userRole === 'owner' || userRole === 'admin') && (
                          <button
                            onClick={() => { navigate('/subscription'); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-200 hover:text-white transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                            {t('layout.subscription')}
                          </button>
                        )}
                        <button
                          onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('layout.signOut')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar (slides down from top) */}
        {searchOpen && (
          <div className="sm:hidden bg-dark-100/95 border-b border-gray-800/60 animate-slide-down">
            <div ref={searchContainerRef} className="px-4 py-3">
              <form onSubmit={handleSearchSubmit} className="relative">
                {searchLoading
                  ? <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gym-500/60 border-t-transparent rounded-full animate-spin" />
                  : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                }
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t('layout.searchPlaceholder')}
                  className="w-full pl-9 pr-10 py-2.5 bg-dark-200 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gym-500/60"
                />
                <button type="button" onClick={closeSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </form>

              {/* Mobile live results */}
              {showDropdown && (
                <div className="mt-2 bg-dark-200 border border-gray-800 rounded-xl overflow-hidden">
                  {searchResults.length > 0 ? (
                    <>
                      {searchResults.map((c, i) => (
                        <button key={c.id} type="button" onMouseDown={() => goToCustomer(c.id)}
                          className={clsx('w-full flex items-center gap-3 px-3 py-2.5 transition-colors',
                            i === selectedIndex ? 'bg-gym-500/15' : 'hover:bg-dark-300/60'
                          )}>
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gym-500 to-gym-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {c.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{c.name}</p>
                            <p className="text-xs text-gray-500 truncate">{c.phone || '—'}</p>
                          </div>
                          <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', statusColor(c.status))} />
                        </button>
                      ))}
                    </>
                  ) : (
                    <p className="px-4 py-4 text-sm text-gray-500 text-center">
                      {searchLoading ? 'Searching…' : `No results for "${searchQuery}"`}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Subscription expired soft-lock modal (global) */}
      <SubscriptionExpiredModal />
    </div>
  );
}

function SidebarContent({ onNavigate, recentActivity = [], getTimeAgo, gymCount = 0 }) {
  const { gym, subscription, user } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();

  const currentPlan = gym?.subscription_plan?.toLowerCase() || 'free';
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);
  const userRole = user?.role || 'owner';
  const isOnTrial = subscription?.status === 'trial';

  const hasPlanAccess = (requiredPlan) => {
    if (!requiredPlan) return true;
    if (isOnTrial) return true; // Full pro access during trial
    return currentPlanIndex >= PLAN_ORDER.indexOf(requiredPlan);
  };

  // Filter nav items the current role can see
  const visibleNav = navigation.filter(item =>
    !item.roles || item.roles.includes(userRole)
  );

  return (
    <div className="flex flex-col h-full bg-dark-100 border-r border-gray-800/50 relative overflow-y-auto overflow-x-hidden">
      {/* Theme colour strip at very top */}
      <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, rgb(var(--gym-400-rgb)), rgb(var(--gym-600-rgb)))' }} />

      {/* Logo */}
      <div className="flex items-center gap-3 h-16 px-5 border-b border-gray-800/50"
        style={{ background: 'linear-gradient(135deg, rgb(var(--gym-600-rgb) / 0.15), transparent)' }}>
        {gym?.logo ? (
          <img
            src={gym.logo}
            alt={gym.name}
            className="w-11 h-11 rounded-2xl object-cover shadow-lg flex-shrink-0 border border-gym-500/30"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgb(var(--gym-500-rgb)), rgb(var(--gym-700-rgb)))', boxShadow: '0 4px 14px rgb(var(--gym-500-rgb) / 0.4)' }}
          >
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-base font-bold text-white leading-tight truncate max-w-[150px]">{gym?.name || t('layout.yourGym')}</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Powered by <span className="text-gray-400 font-medium">Hullu Gyms</span></p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          const isActive = location.pathname === item.href;
          const planOk = hasPlanAccess(item.requiresPlan);

          return (
            <NavLink
              key={item.name}
              to={planOk ? item.href : '/subscription'}
              onClick={onNavigate}
              className={clsx(
                "flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "text-white"
                  : !planOk
                    ? "text-gray-600 cursor-not-allowed opacity-50"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
              style={isActive ? {
                background: 'linear-gradient(135deg, rgb(var(--gym-500-rgb) / 0.25), rgb(var(--gym-700-rgb) / 0.15))',
                borderLeft: '3px solid rgb(var(--gym-400-rgb))',
                boxShadow: 'inset 0 0 20px rgb(var(--gym-500-rgb) / 0.08)',
              } : { borderLeft: '3px solid transparent' }}
            >
              <div className="p-1.5 rounded-lg transition-all duration-200 flex-shrink-0"
                style={isActive ? {
                  background: 'rgb(var(--gym-500-rgb) / 0.25)',
                  color: 'rgb(var(--gym-400-rgb))',
                } : {}}>
                {planOk ? <item.icon className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <span className="text-sm">{item.i18n ? t(item.i18n) : item.name}</span>
              <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                {item.href === '/check-out' && gymCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 bg-green-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm shadow-green-500/40">
                    {gymCount > 99 ? '99+' : gymCount}
                  </span>
                )}
                {item.requiresPlan && !hasPlanAccess(item.requiresPlan) && !isOnTrial && (
                  <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">{t('layout.locked')}</span>
                )}
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: 'rgb(var(--gym-400-rgb))' }} />
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Activity Feed */}
      <div className="px-3 py-4 border-t border-gray-800/50">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-gym-400" />
            <span className="text-xs font-medium text-gray-400">{t('layout.recentActivity')}</span>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-2">{t('layout.noRecentActivity')}</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={activity.id} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.iconBg}`}>
                    <activity.icon className={`w-4 h-4 ${activity.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{t(activity.msgKey, activity.msgVars)}</p>
                    <p className="text-xs text-gray-500">
                      {activity.time ? getTimeAgo(activity.time) : t('layout.todayWord')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800/50">
        <div className="text-xs text-gray-500 text-center space-y-1">
          <div>
            <span className="text-gray-300 font-semibold">{gym?.name || t('layout.yourGym')}</span> {t('layout.byHullu')}
          </div>
          <div>{t('layout.allRightsReserved')}</div>
          <a
            href="https://aleqatech.million-designers.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-gray-600 hover:text-gray-400 transition-colors mt-1"
          >
            Developed by <span className="font-medium text-gray-500 hover:text-gray-300 transition-colors">Aleqa Tech</span>
          </a>
        </div>
      </div>
    </div>
  );
}