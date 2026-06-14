import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  CheckCircle, CreditCard, AlertTriangle, ArrowLeft,
  Crown, Zap, Clock, ChevronRight, Hash, Phone,
  AlertCircle, Loader, Star, Shield, Flame, Lock
} from 'lucide-react';
import clsx from 'clsx';

// Static plan metadata — display strings are resolved via t() at render time
const PLANS = [
  {
    id: 'free',
    nameKey: 'subscription.plan.free',
    price: 0,
    color: 'from-gray-500 to-gray-600',
    icon: Shield,
    emoji: '🏃',
    maxMembers: 10,
    featureKeys: [
      'subscription.feature.upTo10',
      'subscription.feature.customerMgmt',
      'subscription.feature.checkInOut',
      'subscription.feature.attendance',
      'subscription.feature.basicDashboard',
    ],
  },
  {
    id: 'starter',
    nameKey: 'subscription.plan.starter',
    price: 1499,
    color: 'from-blue-500 to-cyan-500',
    icon: Zap,
    emoji: '⚡',
    maxMembers: 100,
    popular: false,
    promo: true,
    featureKeys: [
      'subscription.feature.upTo100',
      'subscription.feature.everythingFree',
      'subscription.feature.sms',
      'subscription.feature.staffAccounts',
      'subscription.feature.reports',
      'subscription.feature.expenseTracking',
      'subscription.feature.pricingPackages',
    ],
  },
  {
    id: 'pro',
    nameKey: 'subscription.plan.pro',
    price: 3499,
    color: 'from-purple-500 to-pink-500',
    icon: Crown,
    emoji: '👑',
    maxMembers: -1,
    popular: true,
    promo: true,
    featureKeys: [
      'subscription.feature.unlimited',
      'subscription.feature.everythingStarter',
      'subscription.feature.revenueAnalytics',
      'subscription.feature.retentionInsights',
      'subscription.feature.equipmentMgmt',
      'subscription.feature.csvExport',
      'subscription.feature.unlimitedStaff',
      'subscription.feature.prioritySupport',
    ],
  },
];

const DURATION_OPTIONS = [
  { months: 1,  labelKey: 'subscription.duration.1month',   discount: 0,  available: true  },
  { months: 3,  labelKey: 'subscription.duration.3months',  discount: 5,  available: true  },
  { months: 6,  labelKey: 'subscription.duration.6months',  discount: 10, available: true  },
  { months: 12, labelKey: 'subscription.duration.12months', discount: 15, available: false },
];

const PAYMENT_METHODS = [
  { id: 'telebirr',      label: 'Telebirr'      },
  { id: 'cbe_birr',      label: 'CBE Birr'      },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'cash',          label: 'Cash at Office'},
];

// Real payment account details
const PAYMENT_DETAILS = {
  telebirr:      { number: '0911 677 153',      label: 'Telebirr Number' },
  cbe_birr:      { number: '1000180769955',      label: 'CBE Account Number' },
  bank_transfer: { number: '1000180769955',      label: 'CBE Account Number' },
  cash:          { number: null,                  label: null },
};
const ACCOUNT_NAME = 'Yegeta Akalu';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { gym, subscription, refreshAuth } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [existingRequest, setExistingRequest] = useState(null);

  // Step state: 'plans' | 'payment'
  const [step, setStep] = useState('plans');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [durationMonths, setDurationMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('telebirr');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Renewal mode: user had a plan that expired or is in grace period
  const isRenewal = subscription?.status === 'expired'
    || subscription?.status === 'grace'
    || subscription?.status === 'trial_expired';
  const previousPlan = gym?.subscription_plan;

  useEffect(() => {
    loadData();
  }, []);

  // Auto-select previous plan and jump straight to payment on renewal
  useEffect(() => {
    if (isRenewal && previousPlan && previousPlan !== 'free' && !selectedPlan) {
      setSelectedPlan(previousPlan);
      setStep('payment');
    }
  }, [isRenewal, previousPlan]);

  const loadData = async () => {
    try {
      const [plansData, myRequest] = await Promise.allSettled([
        api.get('/auth/plans'),
        api.get('/admin/my-request'),
      ]);
      if (plansData.status === 'fulfilled') setPlans(plansData.value);
      if (myRequest.status === 'fulfilled') setExistingRequest(myRequest.value);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanData = PLANS.find(p => p.id === selectedPlan);
  const durationOption = DURATION_OPTIONS.find(d => d.months === durationMonths);
  const basePrice = selectedPlanData ? selectedPlanData.price : 0;
  const discount = durationOption ? durationOption.discount : 0;
  const totalPrice = Math.round(basePrice * durationMonths * (1 - discount / 100));

  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId);
    setStep('payment');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      toast.error(t('subscription.toast.txnRequired'));
      return;
    }
    if (transactionId.trim().length < 4) {
      toast.error(t('subscription.toast.txnTooShort'));
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/admin/subscription-request', {
        plan_id: selectedPlan,
        amount_paid: totalPrice,
        payment_method: paymentMethod,
        transaction_id: transactionId.trim(),
        duration_months: durationMonths,
      });

      toast.success(t('subscription.toast.submitted'));

      await loadData();
      setStep('plans');
      setTransactionId('');
    } catch (err) {
      toast.error(err.message || t('subscription.toast.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-gym-500 animate-spin" />
      </div>
    );
  }

  const isCurrentPlan = (planId) => {
    if (planId === 'free') return !gym?.subscription_plan || gym?.subscription_plan === 'free';
    // In renewal mode, don't mark the plan as "current" so the "Choose" button shows
    if (isRenewal) return false;
    return gym?.subscription_plan === planId && subscription?.valid;
  };
  const isPreviousPlan = (planId) => isRenewal && gym?.subscription_plan === planId;
  const pendingRequest = existingRequest?.status === 'pending' ? existingRequest : null;
  const declinedRequest = existingRequest?.status === 'declined' ? existingRequest : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isRenewal ? t('subscription.renewTitle') : t('subscription.title')}
          </h1>
          <p className="text-gray-400">
            {isRenewal ? t('subscription.renewSubtitle') : t('subscription.subtitle')}
          </p>
        </div>
      </div>

      {/* Grace Period Notice */}
      {subscription?.status === 'grace' && (
        <div className="flex items-start gap-3 px-5 py-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <p className="text-orange-300 text-sm">
            {t('subscription.graceNotice', { n: subscription.graceDaysLeft })}
          </p>
        </div>
      )}

      {/* Current Plan Banner */}
      <div className="card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={clsx(
            'w-14 h-14 rounded-2xl flex items-center justify-center',
            subscription?.valid ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
          )}>
            <Crown className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-400">{t('subscription.currentPlan')}</p>
            <p className="text-xl font-bold text-white capitalize">{gym?.subscription_plan || t('subscription.plan.free')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx(
            'px-3 py-1 rounded-full text-sm font-medium',
            subscription?.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          )}>
            {subscription?.status === 'grace'
              ? t('subscription.graceDaysLeft', { n: subscription.graceDaysLeft })
              : subscription?.valid && subscription.daysLeft > 0
                ? t('subscription.daysLeft', { n: subscription.daysLeft })
                : t('subscription.expired')}
          </span>
        </div>
      </div>

      {/* Pending Request Banner */}
      {pendingRequest && (
        <div className="card p-5 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-white">{t('subscription.pendingTitle')}</p>
              <p className="text-sm text-gray-400 mt-1">
                {t('subscription.pendingBody', {
                  plan: pendingRequest.requested_plan,
                  txn: pendingRequest.transaction_id,
                })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('subscription.pendingSubmitted', { date: new Date(pendingRequest.created_at).toLocaleDateString() })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Declined Request Banner */}
      {declinedRequest && (
        <div className="card p-5 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-white">{t('subscription.declinedTitle')}</p>
              {declinedRequest.admin_notes && (
                <p className="text-sm text-gray-400 mt-1">
                  {t('subscription.declinedReason', { reason: declinedRequest.admin_notes })}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">{t('subscription.declinedRetry')}</p>
            </div>
          </div>
        </div>
      )}

      {step === 'plans' && !pendingRequest && (
        <>
          {/* Early Bird Promo Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm flex-shrink-0">
              <Flame className="w-4 h-4" />
              {t('subscription.earlyBirdLabel')}
            </div>
            <div className="hidden sm:block w-px h-4 bg-amber-500/30" />
            <p className="text-amber-200/75 text-sm">
              {t('subscription.earlyBirdBody')}
            </p>
          </div>

          {/* Plan Cards */}
          <div className="grid md:grid-cols-3 gap-5 pt-4 items-start">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrent = isCurrentPlan(plan.id);
              const isPrevious = isPreviousPlan(plan.id);
              const hasBadge = isCurrent || isPrevious || plan.popular;
              const planName = t(plan.nameKey);
              return (
                <div key={plan.id} className={clsx(
                  'flex flex-col relative transition-all rounded-2xl overflow-hidden border-2',
                  isCurrent && 'border-green-500/50',
                  isPrevious && 'border-orange-500/50',
                  plan.popular && !isCurrent && !isPrevious && 'border-purple-500/50 shadow-xl shadow-purple-500/10',
                  !isCurrent && !isPrevious && !plan.popular && 'border-gray-700/60',
                )}>
                  {/* Coloured header — badges sit inside so overflow:hidden never clips them */}
                  <div className={clsx('p-5 bg-gradient-to-br', plan.color)}>
                    {/* Badge row */}
                    {(plan.popular && !isCurrent && !isPrevious) && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/25 rounded-full text-white text-xs font-bold">
                          👑 Best Value
                        </span>
                      </div>
                    )}
                    {isPrevious && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/25 rounded-full text-white text-xs font-bold">
                          ↻ {t('subscription.renewal')}
                        </span>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/25 rounded-full text-white text-xs font-bold">
                          ✓ Current Plan
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{plan.emoji}</span>
                      {plan.promo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-white text-xs font-semibold">
                          <Flame className="w-3 h-3" /> Early Bird
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white">{planName}</h3>
                    <p className="text-white/70 text-xs mt-0.5">
                      {plan.maxMembers === -1 ? 'Unlimited members' : `Up to ${plan.maxMembers} members`}
                    </p>
                    <div className="mt-3 flex items-baseline gap-1">
                      {plan.price === 0 ? (
                        <span className="text-2xl font-bold text-white">{t('subscription.free')}</span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-white">ETB {plan.price.toLocaleString()}</span>
                          <span className="text-white/60 text-xs">/month</span>
                        </>
                      )}
                    </div>
                    {plan.promo && (
                      <div className="mt-1.5 flex items-center gap-1 text-white/70 text-xs">
                        <Lock className="w-3 h-3 flex-shrink-0" />
                        Price locked for early adopters
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="p-5 flex-1 bg-dark-100">
                    <ul className="space-y-2.5">
                      {plan.featureKeys.map(fKey => (
                        <li key={fKey} className="flex items-start gap-2.5 text-sm text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          {t(fKey)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="p-5 bg-dark-100 border-t border-gray-800">
                    <button
                      onClick={() => plan.price > 0 && handleSelectPlan(plan.id)}
                      disabled={isCurrent || plan.price === 0}
                      className={clsx(
                        'w-full py-3 rounded-xl font-semibold transition-all text-sm',
                        isCurrent
                          ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                          : plan.price === 0
                            ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                            : isPrevious
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90 shadow-lg'
                              : `bg-gradient-to-r ${plan.color} text-white hover:opacity-90 shadow-lg hover:shadow-xl transition-shadow`
                      )}
                    >
                      {isCurrent
                        ? `✓ ${t('subscription.activePlan')}`
                        : plan.price === 0
                          ? t('subscription.defaultPlan')
                          : isPrevious
                            ? `↻ ${t('layout.renewNow')}`
                            : `Choose ${planName} →`}
                    </button>
                    {plan.id === 'pro' && !isCurrent && (
                      <p className="text-center text-xs text-gray-600 mt-2">No credit card · Cancel anytime</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Info */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">{t('subscription.howItWorks')}</h2>
            </div>
            <ol className="space-y-3">
              {[
                t('subscription.step1'),
                t('subscription.step2'),
                t('subscription.step3'),
                t('subscription.step4'),
              ].map((stepText, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                  <span className="w-6 h-6 rounded-full bg-gym-600/30 text-gym-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {stepText}
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {step === 'payment' && selectedPlanData && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <button
            type="button"
            onClick={() => setStep('plans')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> {t('subscription.backToPlans')}
          </button>

          {/* Selected plan summary */}
          <div className={clsx('card p-5 border bg-gradient-to-r opacity-90', selectedPlanData.color.replace('from-', 'border-').split(' ')[0] + '/30')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', selectedPlanData.color)}>
                  <selectedPlanData.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">{t('subscription.planSummary', { name: t(selectedPlanData.nameKey) })}</p>
                  <p className="text-gray-400 text-sm">{t('subscription.pricePerMonth', { price: selectedPlanData.price.toLocaleString() })}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{t('subscription.totalPrice', { total: totalPrice.toLocaleString() })}</p>
                <p className="text-xs text-gray-400">
                  {durationMonths === 1
                    ? t('subscription.forMonths', { n: durationMonths })
                    : t('subscription.forMonthsPlural', { n: durationMonths })}
                  {discount > 0 ? ` ${t('subscription.discountOff', { pct: discount })}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> {t('subscription.duration')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => opt.available && setDurationMonths(opt.months)}
                  disabled={!opt.available}
                  className={clsx(
                    'p-3 rounded-xl border text-center transition-all relative',
                    !opt.available
                      ? 'border-gray-800 bg-dark-200/40 opacity-50 cursor-not-allowed'
                      : durationMonths === opt.months
                        ? 'border-gym-500 bg-gym-500/10 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  )}
                >
                  <p className="font-semibold text-sm">{t(opt.labelKey)}</p>
                  {!opt.available ? (
                    <p className="text-xs text-gray-500 mt-0.5">{t('subscription.comingSoon')}</p>
                  ) : opt.discount > 0 ? (
                    <p className="text-xs text-green-400 mt-0.5">{opt.discount}% off</p>
                  ) : null}
                  <p className="text-xs text-gray-500 mt-1">
                    {opt.available
                      ? `ETB ${Math.round(selectedPlanData.price * opt.months * (1 - opt.discount / 100)).toLocaleString()}`
                      : '—'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" /> {t('subscription.paymentMethod')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={clsx(
                    'p-3 rounded-xl border text-sm font-medium transition-all',
                    paymentMethod === method.id
                      ? 'border-gym-500 bg-gym-500/10 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>

            {/* Context-sensitive payment details */}
            {paymentMethod !== 'cash' && (
              <div className="p-4 bg-dark-200 rounded-xl border border-gray-700 space-y-3">
                <p className="text-sm font-medium text-gray-300">
                  {t('subscription.sendAmount', { amount: `ETB ${totalPrice.toLocaleString()}` })}
                </p>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-gray-500">{PAYMENT_DETAILS[paymentMethod]?.label}</p>
                    <p className="text-white font-mono font-bold text-lg tracking-wider">
                      {PAYMENT_DETAILS[paymentMethod]?.number}
                    </p>
                    <p className="text-sm text-gray-400">
                      {t('subscription.accountName', { name: ACCOUNT_NAME })}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {paymentMethod === 'cash' && (
              <div className="p-4 bg-dark-200 rounded-xl border border-gray-700">
                <p className="text-sm text-gray-400">{t('subscription.cashNote')}</p>
              </div>
            )}
          </div>

          {/* Transaction ID */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" /> {t('subscription.transactionId')}
            </h3>
            <p className="text-sm text-gray-400">{t('subscription.transactionHint')}</p>
            <input
              type="text"
              value={transactionId}
              onChange={e => setTransactionId(e.target.value)}
              className="input-field font-mono tracking-wider"
              placeholder={t('subscription.transactionPlaceholder')}
              required
            />
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t('subscription.transactionWarning')}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !transactionId.trim()}
            className="w-full btn-primary py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <><Loader className="w-5 h-5 animate-spin" /> {t('subscription.submitting')}</>
            ) : (
              <>{t('subscription.submit')} <ChevronRight className="w-5 h-5" /></>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
