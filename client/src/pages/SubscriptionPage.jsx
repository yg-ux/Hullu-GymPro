import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle,
  CreditCard,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Crown,
  Zap
} from 'lucide-react';
import clsx from 'clsx';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [gym, setGym] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [meData, plansData] = await Promise.all([
        api.get('/auth/me'),
        api.get('/auth/plans')
      ]);
      
      setGym(meData.gym);
      setSubscription(meData.subscription);
      setPlans(plansData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    setUpdating(true);
    setMessage('');
    
    try {
      await api.post('/auth/subscribe', { plan_id: planId });
      
      // Refresh the global auth context so Layout and FeatureGate see the new plan
      await refreshAuth();
      
      // Reload local data for this page
      await loadData();
      setMessage('Subscription updated successfully!');
    } catch (error) {
      setMessage('Failed to update subscription: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Subscription</h1>
          <p className="text-gray-400">Manage your GymPro plan</p>
        </div>
      </div>

      {/* Current Plan */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-16 h-16 rounded-2xl flex items-center justify-center",
              subscription?.status === 'active' && "bg-gradient-to-br from-green-500 to-emerald-600",
              subscription?.status === 'trial' && "bg-gradient-to-br from-yellow-500 to-orange-600",
              (!subscription?.valid) && "bg-gradient-to-br from-red-500 to-rose-600"
            )}>
              {subscription?.status === 'active' ? (
                <Crown className="w-8 h-8 text-white" />
              ) : (
                <Zap className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white capitalize">
                  {subscription?.status === 'trial' ? 'Free Trial' : gym?.subscription_plan}
                </h2>
                <span className={clsx(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  subscription?.valid && "bg-green-500/20 text-green-400",
                  !subscription?.valid && "bg-red-500/20 text-red-400"
                )}>
                  {subscription?.status === 'expired' || subscription?.status === 'trial_expired' 
                    ? 'Expired' 
                    : subscription?.valid 
                      ? 'Active' 
                      : 'Inactive'
                  }
                </span>
              </div>
              <p className="text-gray-400">
                {subscription?.daysLeft > 0 
                  ? `${subscription.daysLeft} days remaining`
                  : 'Please subscribe to continue'
                }
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              ETB {plans.find(p => p.id === gym?.subscription_plan)?.price || 3000}
              <span className="text-sm font-normal text-gray-400">/month</span>
            </p>
            <p className="text-sm text-gray-500">
              Renews: {gym?.subscription_end || 'N/A'}
            </p>
          </div>
        </div>

        {message && (
          <div className={clsx(
            "mt-4 p-4 rounded-lg",
            message.includes('success') 
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          )}>
            {message}
          </div>
        )}
      </div>

      {/* Warning if expired or trial expiring */}
      {!subscription?.valid && (
        <div className="card p-6 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white mb-1">Action Required</h3>
              <p className="text-gray-400">
                {subscription?.status === 'trial_expired'
                  ? "Your free trial has ended. Subscribe to a plan to continue using GymPro."
                  : "Your subscription has expired. Renew now to avoid losing access to your data."
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Available Plans</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = gym?.subscription_plan === plan.id;
            const isActive = subscription?.status === 'active' && isCurrentPlan;
            
            return (
              <div 
                key={plan.id}
                className={clsx(
                  "card p-6 transition-all",
                  isCurrentPlan 
                    ? "border-gym-500/50 bg-gym-500/5" 
                    : "border-gray-800 hover:border-gray-700"
                )}
              >
                {isCurrentPlan && (
                  <div className="text-center mb-4">
                    <span className="px-3 py-1 bg-gym-500/20 text-gym-400 text-sm font-medium rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}
                
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-4">
                  {plan.max_members === -1 ? 'Unlimited members' : `Up to ${plan.max_members} members`}
                </p>
                
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">ETB {plan.price.toLocaleString()}</span>
                  <span className="text-gray-400">/{plan.period}</span>
                </div>
                
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={updating || isActive}
                  className={clsx(
                    "w-full py-3 rounded-lg font-medium transition-all",
                    isActive 
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gym-600 hover:bg-gym-700 text-white"
                  )}
                >
                  {updating ? 'Processing...' : isActive ? 'Current Plan' : `Subscribe to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-400" />
          How to Pay
        </h2>
        
        <div className="space-y-4 text-gray-300">
          <p>To subscribe, contact us via:</p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gym-500" />
              Telebirr / Cash to our office
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gym-500" />
              Bank transfer (contact for details)
            </li>
          </ul>
          <p className="text-sm text-gray-500">
            After payment, your subscription will be activated within 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
