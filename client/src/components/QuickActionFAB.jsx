import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, X, UserPlus, LogIn, DollarSign } from 'lucide-react';
import clsx from 'clsx';

const ALL_ROLES = ['owner', 'admin', 'manager', 'trainer', 'receptionist'];

const ACTIONS = [
  {
    key: 'addMember',
    labelKey: 'fab.addMember',
    icon: UserPlus,
    color: 'from-gym-500 to-gym-600',
    shadow: 'shadow-gym-500/40',
    href: '/customers/new',
    roles: ['owner', 'admin', 'manager'],
  },
  {
    key: 'checkIn',
    labelKey: 'fab.checkIn',
    icon: LogIn,
    color: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-500/40',
    href: '/check-in',
    roles: ALL_ROLES,
  },
  {
    key: 'recordPayment',
    labelKey: 'fab.recordPayment',
    icon: DollarSign,
    color: 'from-amber-500 to-amber-600',
    shadow: 'shadow-amber-500/40',
    // Opens the revenue/payment page; CustomerDetail handles payments per-user
    href: '/revenue',
    roles: ['owner', 'admin', 'manager'],
  },
];

export default function QuickActionFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const userRole = user?.role || 'owner';

  // Don't show on pages where the FAB would clutter key controls
  const hiddenRoutes = ['/check-in', '/check-out', '/kiosk'];
  if (hiddenRoutes.some(r => location.pathname.startsWith(r))) return null;

  const visibleActions = ACTIONS.filter(a => a.roles.includes(userRole));
  if (visibleActions.length === 0) return null;

  const handleAction = (href) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* FAB container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Action buttons — fan upward */}
        {visibleActions.map((action, i) => {
          const Icon = action.icon;
          const delay = open ? i * 60 : (visibleActions.length - 1 - i) * 40;
          return (
            <div
              key={action.key}
              className={clsx(
                'flex items-center gap-3 transition-all duration-300',
                open
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-6 pointer-events-none'
              )}
              style={{ transitionDelay: `${delay}ms` }}
            >
              {/* Label */}
              <span className="bg-dark-100/95 backdrop-blur-sm text-white text-sm font-medium px-3 py-1.5 rounded-xl border border-gray-700/60 shadow-lg whitespace-nowrap">
                {t(action.labelKey)}
              </span>

              {/* Mini button */}
              <button
                onClick={() => handleAction(action.href)}
                className={clsx(
                  'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95',
                  action.color,
                  action.shadow
                )}
              >
                <Icon className="w-5 h-5 text-white" />
              </button>
            </div>
          );
        })}

        {/* Main FAB toggle */}
        <button
          onClick={() => setOpen(!open)}
          className={clsx(
            'w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 active:scale-95',
            open
              ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/40 rotate-45'
              : 'bg-gradient-to-br from-gym-500 to-gym-700 shadow-gym-500/40'
          )}
          style={{ boxShadow: open
            ? '0 8px 25px rgba(239,68,68,0.45)'
            : '0 8px 25px rgb(var(--gym-500-rgb) / 0.45)'
          }}
        >
          {open ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </button>
      </div>
    </>
  );
}
