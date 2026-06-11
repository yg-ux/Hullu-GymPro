import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Crown,
  X,
  UserPlus,
  LogIn,
  DollarSign,
  BarChart3,
  MessageSquare,
  Users,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

const LOCKED_FEATURES = [
  { icon: UserPlus,    key: 'gate.featureAddMembers'   },
  { icon: LogIn,       key: 'gate.featureCheckIn'       },
  { icon: DollarSign,  key: 'gate.featurePayments'      },
  { icon: Users,       key: 'gate.featureStaff'         },
  { icon: BarChart3,   key: 'gate.featureReports'       },
  { icon: MessageSquare, key: 'gate.featureSms'         },
];

export default function SubscriptionExpiredModal() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { subscription, gym } = useAuth();
  const { t } = useLanguage();

  // Listen for the global 'subscription-expired' event fired by api.js or useSubscriptionGate
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('subscription-expired', handler);
    return () => window.removeEventListener('subscription-expired', handler);
  }, []);

  if (!open) return null;

  const plan = subscription?.plan || gym?.subscription_plan || 'pro';
  const planLabel = plan === 'pro' ? 'Pro' : plan === 'starter' ? 'Starter' : plan;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card overflow-hidden animate-scale-in shadow-2xl">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-dark-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Icon + heading */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('gate.title')}</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {t('gate.subtitle', { plan: planLabel })}
              </p>
            </div>
          </div>

          {/* Read-only note */}
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-300">{t('gate.readOnlyNote')}</p>
          </div>

          {/* Locked features grid */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t('gate.lockedFeatures')}
          </p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {LOCKED_FEATURES.map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-center gap-2 px-3 py-2 bg-dark-300/60 rounded-lg opacity-60">
                <div className="w-5 h-5 rounded bg-dark-200 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3 h-3 text-gray-500" />
                </div>
                <span className="text-xs text-gray-500 truncate">{t(key)}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => { setOpen(false); navigate('/subscription'); }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 mb-3"
          >
            <Crown className="w-4 h-4" />
            {t('gate.renewBtn', { plan: planLabel })}
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setOpen(false)}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t('gate.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
