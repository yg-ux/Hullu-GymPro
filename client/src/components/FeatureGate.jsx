import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Crown,
  ArrowUpRight,
  X,
  Check
} from 'lucide-react';
import clsx from 'clsx';

const FEATURE_REQUIREMENTS = {
  staff_management: {
    requiredPlan: 'pro',
    label: 'Staff Management',
    description: 'Add and manage staff members with role-based access control',
    icon: '👥',
  },
  advanced_analytics: {
    requiredPlan: 'pro',
    label: 'Advanced Analytics',
    description: 'Detailed insights and reports on gym performance',
    icon: '📊',
  },
  multi_branch: {
    requiredPlan: 'enterprise',
    label: 'Multi-Branch',
    description: 'Manage multiple gym locations from one dashboard',
    icon: '🏢',
  },
  api_access: {
    requiredPlan: 'enterprise',
    label: 'API Access',
    description: 'Integrate with third-party applications via API',
    icon: '🔌',
  },
};

const PLAN_ORDER = ['starter', 'pro', 'enterprise'];

export default function FeatureGate({ 
  feature, 
  children, 
  fallback: FallbackComponent,
  showUpgradePrompt = true 
}) {
  const { subscription, gym } = useAuth();
  const navigate = useNavigate();

  const featureConfig = FEATURE_REQUIREMENTS[feature];
  
  if (!featureConfig) {
    console.warn(`FeatureGate: Unknown feature "${feature}"`);
    return children;
  }

  const currentPlan = gym?.subscription_plan?.toLowerCase() || 'starter';
  const requiredPlanIndex = PLAN_ORDER.indexOf(featureConfig.requiredPlan);
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);
  
  const hasAccess = currentPlanIndex >= requiredPlanIndex;

  if (hasAccess) {
    return children;
  }

  if (FallbackComponent) {
    return <FallbackComponent />;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <div className="animate-fade-in">
      {/* Locked Feature Card */}
      <div className="card overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-gym-600/20 to-purple-600/20 p-6 border-b border-gray-800">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center text-2xl">
              {featureConfig.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white">{featureConfig.label}</h3>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              </div>
              <p className="text-gray-400 text-sm">{featureConfig.description}</p>
            </div>
          </div>
        </div>

        {/* Plan Comparison */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Your current plan:</span>
            <span className={clsx(
              "px-3 py-1 rounded-lg text-sm font-medium capitalize",
              currentPlan === 'starter' && "bg-gray-500/20 text-gray-400",
              currentPlan === 'pro' && "bg-blue-500/20 text-blue-400",
              currentPlan === 'enterprise' && "bg-purple-500/20 text-purple-400"
            )}>
              {currentPlan}
            </span>
          </div>

          <div className="bg-dark-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-300 mb-3">Upgrade to Pro+ to unlock:</p>
            <ul className="space-y-2">
              {featureConfig.label === 'Staff Management' && (
                <>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    Add multiple staff members
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    Role-based access control
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    Track staff activity
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    Manage permissions by role
                  </li>
                </>
              )}
              {featureConfig.label === 'Advanced Analytics' && (
                <>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    Revenue reports
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    Customer trends
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    Attendance analytics
                  </li>
                </>
              )}
              {featureConfig.label === 'Multi-Branch' && (
                <>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    Manage multiple locations
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    Consolidated reports
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    Cross-branch customer view
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Upgrade Button */}
          <button
            onClick={() => navigate('/subscription')}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-gym-600 to-purple-600 hover:from-gym-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-gym-600/20"
          >
            <Crown className="w-5 h-5" />
            Upgrade to Pro
            <ArrowUpRight className="w-4 h-4" />
          </button>

          <p className="text-center text-xs text-gray-500 mt-3">
            Starting at ETB 3,000/month
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper hook for checking feature access
export function useFeatureAccess(feature) {
  const { gym } = useAuth();
  const currentPlan = gym?.subscription_plan?.toLowerCase() || 'starter';
  
  const featureConfig = FEATURE_REQUIREMENTS[feature];
  if (!featureConfig) return true;

  const requiredPlanIndex = PLAN_ORDER.indexOf(featureConfig.requiredPlan);
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);
  
  return currentPlanIndex >= requiredPlanIndex;
}