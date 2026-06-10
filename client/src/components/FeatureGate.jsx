import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Lock,
  Crown,
  ArrowUpRight,
  X,
  Check
} from 'lucide-react';
import clsx from 'clsx';

const FEATURE_REQUIREMENTS = {
  staff_management:    { requiredPlan: 'pro',        icon: '👥' },
  advanced_analytics:  { requiredPlan: 'pro',        icon: '📊' },
  multi_branch:        { requiredPlan: 'enterprise', icon: '🏢' },
  api_access:          { requiredPlan: 'enterprise', icon: '🔌' },
};

const PLAN_ORDER = ['starter', 'pro', 'enterprise'];

export default function FeatureGate({
  feature,
  children,
  fallback: FallbackComponent,
  showUpgradePrompt = true
}) {
  const { subscription, gym } = useAuth();
  const { t } = useLanguage();
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
                <h3 className="text-lg font-bold text-white">{t(`feature.${feature}.label`)}</h3>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                  <Lock className="w-3 h-3" />
                  {t('feature.locked')}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{t(`feature.${feature}.description`)}</p>
            </div>
          </div>
        </div>

        {/* Plan Comparison */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">{t('feature.yourCurrentPlan')}</span>
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
            <p className="text-sm text-gray-300 mb-3">{t('feature.upgradeToUnlock')}</p>
            <ul className="space-y-2">
              {feature === 'staff_management' && (
                <>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {t('feature.staff_management.item1')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {t('feature.staff_management.item2')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {t('feature.staff_management.item3')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {t('feature.staff_management.item4')}
                  </li>
                </>
              )}
              {feature === 'advanced_analytics' && (
                <>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {t('feature.advanced_analytics.item1')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {t('feature.advanced_analytics.item2')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {t('feature.advanced_analytics.item3')}
                  </li>
                </>
              )}
              {feature === 'multi_branch' && (
                <>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {t('feature.multi_branch.item1')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {t('feature.multi_branch.item2')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {t('feature.multi_branch.item3')}
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
            {t('feature.upgradeToPro')}
            <ArrowUpRight className="w-4 h-4" />
          </button>

          <p className="text-center text-xs text-gray-500 mt-3">
            {t('feature.startingAt')}
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