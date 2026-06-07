import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  CheckCircle, CreditCard, AlertTriangle, ArrowLeft,
  Crown, Zap, Clock, ChevronRight, Hash, Phone,
  AlertCircle, Loader, Star, Shield
} from 'lucide-react';
import clsx from 'clsx';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    color: 'from-gray-500 to-gray-600',
    icon: Shield,
    maxMembers: 10,
    features: ['Up to 10 members', 'Customer management', 'Attendance tracking', 'Check-in / Check-out', 'Basic dashboard'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 1499,
    color: 'from-blue-500 to-cyan-500',
    icon: Zap,
    maxMembers: 100,
    popular: false,
    features: ['Up to 100 members', 'Everything in Free', 'SMS notifications', 'Staff accounts', 'Reports & analytics'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 3499,
    color: 'from-purple-500 to-pink-500',
    icon: Crown,
    maxMembers: -1,
    popular: true,
    features: ['Unlimited members', 'Everything in Starter', 'Revenue analytics', 'CSV export', 'Priority support', 'QR code check-in'],
  },
];

const DURATION_OPTIONS = [
  { months: 1, label: '1 Month', discount: 0 },
  { months: 3, label: '3 Months', discount: 5 },
  { months: 6, label: '6 Months', discount: 10 },
  { months: 12, label: '12 Months', discount: 15 },
];

const PAYMENT_METHODS = [
  { id: 'telebirr', label: 'Telebirr' },
  { id: 'cbe_birr', label: 'CBE Birr' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'cash', label: 'Cash at Office' },
];

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { gym, subscription, refreshAuth } = useAuth();
  const toast = useToast();

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

  useEffect(() => {
    loadData();
  }, []);

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
      toast.error('Please enter your transaction ID');
      return;
    }
    if (transactionId.trim().length < 4) {
      toast.error('Transaction ID seems too short. Please check and try again.');
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
      toast.success('Request submitted! We\'ll activate your plan shortly.');
      await loadData();
      setStep('plans');
      setTransactionId('');
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
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
    return gym?.subscription_plan === planId && subscription?.valid;
  };
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
          <h1 className="text-2xl font-bold text-white">Subscription</h1>
          <p className="text-gray-400">Upgrade your Hullu Gyms plan</p>
        </div>
      </div>

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
            <p className="text-sm text-gray-400">Current Plan</p>
            <p className="text-xl font-bold text-white capitalize">{gym?.subscription_plan || 'Free'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx(
            'px-3 py-1 rounded-full text-sm font-medium',
            subscription?.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          )}>
            {subscription?.valid ? `${subscription.daysLeft} days left` : 'Expired'}
          </span>
        </div>
      </div>

      {/* Pending Request Banner */}
      {pendingRequest && (
        <div className="card p-5 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-white">Subscription Request Under Review</p>
              <p className="text-sm text-gray-400 mt-1">
                Your request to upgrade to <span className="text-yellow-400 font-medium capitalize">{pendingRequest.requested_plan}</span> plan
                is being reviewed. Transaction ID: <span className="font-mono text-white">{pendingRequest.transaction_id}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Submitted {new Date(pendingRequest.created_at).toLocaleDateString()}</p>
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
              <p className="font-semibold text-white">Previous Request Declined</p>
              {declinedRequest.admin_notes && (
                <p className="text-sm text-gray-400 mt-1">Reason: {declinedRequest.admin_notes}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">You can submit a new request below.</p>
            </div>
          </div>
        </div>
      )}

      {step === 'plans' && !pendingRequest && (
        <>
          {/* Plan Cards */}
          <div className="grid md:grid-cols-3 gap-5 pt-4">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrent = isCurrentPlan(plan.id);
              const hasBadge = isCurrent || plan.popular;
              return (
                <div key={plan.id} className={clsx(
                  'card p-6 flex flex-col relative transition-all overflow-visible',
                  hasBadge && 'mt-4',
                  isCurrent ? 'border-green-500/40 bg-green-500/5' : 'hover:border-gym-500/40',
                  plan.popular && !isCurrent && 'border-purple-500/40'
                )}>
                  {plan.popular && !isCurrent && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
                        MOST POPULAR
                      </span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                        ✓ CURRENT PLAN
                      </span>
                    </div>
                  )}

                  <div className={clsx('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', plan.color)}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {plan.maxMembers === -1 ? 'Unlimited members' : `Up to ${plan.maxMembers} members`}
                  </p>

                  <div className="mb-5">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-bold text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">ETB {plan.price.toLocaleString()}</span>
                        <span className="text-gray-400 text-sm">/month</span>
                      </>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => plan.price > 0 && handleSelectPlan(plan.id)}
                    disabled={isCurrent || plan.price === 0}
                    className={clsx(
                      'w-full py-3 rounded-lg font-medium transition-all',
                      isCurrent
                        ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                        : plan.price === 0
                          ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                          : `bg-gradient-to-r ${plan.color} text-white hover:opacity-90 hover:shadow-lg`
                    )}
                  >
                    {isCurrent ? 'Active Plan' : plan.price === 0 ? 'Default Plan' : `Choose ${plan.name}`}
                  </button>
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
              <h2 className="text-lg font-semibold text-white">How It Works</h2>
            </div>
            <ol className="space-y-3">
              {[
                'Choose the plan that fits your gym',
                'Select how many months you want to pay for',
                'Send payment via Telebirr / CBE Birr / Bank Transfer',
                'Enter your transaction ID — we\'ll verify and activate within hours',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                  <span className="w-6 h-6 rounded-full bg-gym-600/30 text-gym-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
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
            <ArrowLeft className="w-4 h-4" /> Back to plans
          </button>

          {/* Selected plan summary */}
          <div className={clsx('card p-5 border bg-gradient-to-r opacity-90', selectedPlanData.color.replace('from-', 'border-').split(' ')[0] + '/30')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', selectedPlanData.color)}>
                  <selectedPlanData.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">{selectedPlanData.name} Plan</p>
                  <p className="text-gray-400 text-sm">ETB {selectedPlanData.price.toLocaleString()}/month</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">ETB {totalPrice.toLocaleString()}</p>
                <p className="text-xs text-gray-400">for {durationMonths} month{durationMonths > 1 ? 's' : ''}{discount > 0 ? ` (${discount}% off)` : ''}</p>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Duration
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => setDurationMonths(opt.months)}
                  className={clsx(
                    'p-3 rounded-xl border text-center transition-all',
                    durationMonths === opt.months
                      ? 'border-gym-500 bg-gym-500/10 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  )}
                >
                  <p className="font-semibold text-sm">{opt.label}</p>
                  {opt.discount > 0 && (
                    <p className="text-xs text-green-400 mt-0.5">{opt.discount}% off</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    ETB {Math.round(selectedPlanData.price * opt.months * (1 - opt.discount / 100)).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" /> Payment Method
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

            {/* Payment details box */}
            <div className="p-4 bg-dark-200 rounded-xl border border-gray-700 space-y-2">
              <p className="text-sm font-medium text-gray-300">Send <span className="text-white font-bold">ETB {totalPrice.toLocaleString()}</span> to:</p>
              <div className="space-y-1 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>Telebirr / CBE: <span className="text-white font-mono">+251 91 123 4567</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Bank: Commercial Bank of Ethiopia — <span className="text-white font-mono">1000123456789</span></span>
                </div>
                <p className="text-xs text-gray-500 pt-1">Account name: Hullu Ceramics PLC</p>
              </div>
            </div>
          </div>

          {/* Transaction ID */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" /> Transaction ID
            </h3>
            <p className="text-sm text-gray-400">After completing payment, enter the transaction reference number you received.</p>
            <input
              type="text"
              value={transactionId}
              onChange={e => setTransactionId(e.target.value)}
              className="input-field font-mono tracking-wider"
              placeholder="e.g. TXN-20260606-12345"
              required
            />
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              We will verify this transaction before activating your plan
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !transactionId.trim()}
            className="w-full btn-primary py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <><Loader className="w-5 h-5 animate-spin" /> Submitting Request...</>
            ) : (
              <>Submit Subscription Request <ChevronRight className="w-5 h-5" /></>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
