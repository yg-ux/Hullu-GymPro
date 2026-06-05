import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  Sun,
  Moon,
  Bell,
  DollarSign,
  UserPlus,
  Clock,
  Activity,
  Lock,
  BarChart3,
  UserCog,
  TrendingUp
} from 'lucide-react';
import clsx from 'clsx';

// Plan requirements: free < starter < pro
const PLAN_ORDER = ['free', 'starter', 'pro'];

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Check In', href: '/check-in', icon: LogIn },
  { name: 'Check Out', href: '/check-out', icon: LogOutIcon },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Staff', href: '/staff', icon: UserCog, requiresPlan: 'starter' },
  { name: 'Reports', href: '/reports', icon: BarChart3, requiresPlan: 'pro' },
  { name: 'Revenue', href: '/revenue', icon: TrendingUp, requiresPlan: 'pro' },
];

export default function Layout() {
  const { user, gym, subscription, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Apply theme class and color theme
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.documentElement.classList.toggle('light-mode', !darkMode);
    
    // Apply color theme as CSS variables
    const colorTheme = gym?.color_theme || 'default';
    const themeColors = {
      default: { primary: '#3b82f6', primaryDark: '#2563eb', accent: '#60a5fa' },
      emerald: { primary: '#10b981', primaryDark: '#059669', accent: '#34d399' },
      purple: { primary: '#a855f7', primaryDark: '#9333ea', accent: '#c084fc' },
      red: { primary: '#ef4444', primaryDark: '#dc2626', accent: '#f87171' },
      amber: { primary: '#f59e0b', primaryDark: '#d97706', accent: '#fbbf24' },
      cyan: { primary: '#06b6d4', primaryDark: '#0891b2', accent: '#22d3ee' },
    };
    const colors = themeColors[colorTheme] || themeColors.default;
    
    document.documentElement.style.setProperty('--gym-500', colors.primary);
    document.documentElement.style.setProperty('--gym-600', colors.primaryDark);
    document.documentElement.style.setProperty('--gym-400', colors.accent);
  }, [darkMode, gym?.color_theme]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const showSubscriptionAlert = subscription && !subscription.valid;

  // Sample notifications - in production these would come from API
  const notifications = [
    { id: 1, type: 'payment', message: 'New payment received from Alemu Bekele', time: '5 min ago', icon: DollarSign },
    { id: 2, type: 'checkin', message: 'Tigist Haile checked in', time: '12 min ago', icon: UserPlus },
    { id: 3, type: 'expiry', message: '3 memberships expiring soon', time: '1 hour ago', icon: Clock },
  ];

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

  return (
    <div className="min-h-screen bg-dark-200">
      {/* Subscription Alert Banner */}
      {showSubscriptionAlert && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/30 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span>
                {subscription.status === 'trial_expired' 
                  ? 'Your free trial has ended. Subscribe to continue.'
                  : 'Your subscription has expired. Please renew.'}
              </span>
            </div>
            <button 
              onClick={() => navigate('/subscription')}
              className="px-4 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-sm font-medium rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg shadow-yellow-500/20"
            >
              Subscribe Now
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
          "absolute left-0 top-0 h-full w-72 bg-gradient-to-b from-dark-100 to-dark-200 border-r border-gray-800 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center shadow-lg shadow-gym-500/30 animate-pulse-glow">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">{gym?.name || 'Hullu Gyms'}</h1>
                <p className="text-xs text-gray-400 truncate max-w-[140px]">by Hullu Gyms</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent />
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

            <div className="flex items-center gap-3 ml-auto">
              {/* Dark/Light Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-dark-100 transition-all duration-300"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-dark-100 transition-all duration-300"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setNotifOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-80 glass-card shadow-xl z-20 overflow-hidden animate-slide-down">
                      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        <span className="text-xs text-gray-400 bg-dark-200 px-2 py-1 rounded-full">
                          {notifications.length} new
                        </span>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map(notif => (
                          <div 
                            key={notif.id}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-dark-200/50 transition-colors cursor-pointer border-b border-gray-800/50"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gym-500/20 flex items-center justify-center flex-shrink-0">
                              <notif.icon className="w-5 h-5 text-gym-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white">{notif.message}</p>
                              <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-3 bg-dark-100/50 border-t border-gray-800">
                        <button className="w-full text-sm text-gym-400 hover:text-gym-300 transition-colors">
                          View all notifications
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
                  subscription?.valid
                    ? "bg-green-500/10 hover:bg-green-500/20 text-green-400"
                    : "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400"
                )}
              >
                {subscription?.valid ? (
                  <Crown className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {subscription?.status === 'trial' ? 'Free Trial' : gym?.subscription_plan || 'Starter'}
                </span>
                {subscription?.daysLeft > 0 && (
                  <span className="hidden sm:inline text-xs opacity-70">
                    ({subscription.daysLeft}d)
                  </span>
                )}
              </button>

              {/* Plan Badge (Tier Colors) */}
              <span className={clsx(
                "hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                getPlanBadgeClass(gym?.subscription_plan)
              )}>
                {gym?.subscription_plan || 'Starter'}
              </span>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 p-2 text-gray-300 hover:text-white rounded-xl hover:bg-dark-100 transition-all duration-300"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gym-500 via-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-gym-500/30">
                    {user?.username?.[0]?.toUpperCase() || 'A'}
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
                      <div className="px-4 py-4 border-b border-gray-800 bg-gradient-to-r from-gym-500/10 to-purple-500/10">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center text-lg font-bold shadow-lg">
                            {user?.username?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{gym?.name}</p>
                            <p className="text-xs text-gray-400">{user?.username}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="py-2">
                        <button
                          onClick={() => { navigate('/subscription'); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-200 hover:text-white transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          Subscription
                        </button>
                        <button
                          onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  const { gym, subscription } = useAuth();
  const location = useLocation();
  
  const currentPlan = gym?.subscription_plan?.toLowerCase() || 'free';
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);

  const hasAccess = (requiredPlan) => {
    if (!requiredPlan) return true;
    const requiredIndex = PLAN_ORDER.indexOf(requiredPlan);
    return currentPlanIndex >= requiredIndex;
  };

  const getPlanBadge = (requiredPlan) => {
    if (!requiredPlan) return null;
    if (currentPlan === 'pro' && requiredPlan === 'pro') {
      return <span className="ml-auto text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">Pro</span>;
    }
    if (hasAccess(requiredPlan)) {
      return <span className="ml-auto text-xs px-2 py-0.5 bg-gym-500/20 text-gym-400 rounded-full capitalize">{requiredPlan}+</span>;
    }
    return <span className="ml-auto text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">Locked</span>;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-dark-100 to-dark-200 border-r border-gray-800/50">
      {/* Logo */}
      <div className="flex items-center gap-3 h-16 px-6 border-b border-gray-800/50 bg-gradient-to-r from-dark-100 to-dark-200">
        <div className={clsx(
          "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-glow",
          gym?.color_theme === 'emerald' && "bg-gradient-to-br from-emerald-500 to-emerald-600",
          gym?.color_theme === 'purple' && "bg-gradient-to-br from-purple-500 to-purple-600",
          gym?.color_theme === 'red' && "bg-gradient-to-br from-red-500 to-red-600",
          gym?.color_theme === 'amber' && "bg-gradient-to-br from-amber-500 to-amber-600",
          gym?.color_theme === 'cyan' && "bg-gradient-to-br from-cyan-500 to-cyan-600",
          (!gym?.color_theme || gym?.color_theme === 'default') && "bg-gradient-to-br from-gym-500 via-purple-500 to-pink-500"
        )}>
          <Dumbbell className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold gradient-text">Hullu Gyms</h1>
          <p className="text-xs text-gray-400 truncate max-w-[160px]">{gym?.name || 'Your Gym'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const access = hasAccess(item.requiresPlan);
          
          return (
            <NavLink
              key={item.name}
              to={access ? item.href : '/subscription'}
              onClick={onNavigate}
              className={clsx(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 group",
                isActive 
                  ? "bg-gradient-to-r from-gym-600/30 to-purple-600/30 text-gym-400 shadow-lg shadow-gym-500/10 border border-gym-500/20" 
                  : !access
                    ? "text-gray-500 cursor-not-allowed opacity-60"
                    : "text-gray-400 hover:text-white hover:bg-dark-100 border border-transparent"
              )}
            >
              <div className={clsx(
                "p-2 rounded-lg transition-all duration-300",
                isActive ? "bg-gym-500/20" : !access ? "bg-dark-300" : "bg-dark-300 group-hover:bg-dark-200"
              )}>
                {access ? (
                  <item.icon className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </div>
              {item.name}
              {getPlanBadge(item.requiresPlan)}
              {isActive && (
                <div className="ml-auto w-2 h-2 rounded-full bg-gym-400 animate-pulse" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Activity Feed */}
      <div className="px-3 py-4 border-t border-gray-800/50">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-gym-400" />
            <span className="text-xs font-medium text-gray-400">Recent Activity</span>
          </div>
          <div className="space-y-3">
            {[
              { icon: UserPlus, text: 'New member joined', time: '2m ago' },
              { icon: DollarSign, text: 'Payment received', time: '15m ago' },
              { icon: Clock, text: '3 memberships expiring', time: '1h ago' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-8 h-8 rounded-lg bg-gym-500/10 flex items-center justify-center">
                  <activity.icon className="w-4 h-4 text-gym-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{activity.text}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800/50">
        <div className="text-xs text-gray-500 text-center">
          <span className="gradient-text font-semibold">{gym?.name || 'Your Gym'}</span> by <span className="gradient-text font-semibold">Hullu Gyms</span>
          <br />
          © 2024 All rights reserved
        </div>
      </div>
    </div>
  );
}