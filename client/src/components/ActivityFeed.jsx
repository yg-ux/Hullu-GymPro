import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import {
  Activity,
  UserPlus,
  DollarSign,
  Clock,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  TrendingUp,
  MoreHorizontal
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * ActivityFeed Component
 * A timeline component for displaying activity events
 */
export function ActivityFeed({
  activities = [],
  maxItems = 10,
  showHeader = true,
  headerTitle,
  className = ''
}) {
  const { t } = useLanguage();
  const [visibleItems, setVisibleItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Animate items in sequence
    const timer = setTimeout(() => {
      setVisibleItems(activities.slice(0, maxItems));
    }, 100);
    return () => clearTimeout(timer);
  }, [activities, maxItems]);

  if (activities.length === 0) {
    return (
      <div className={clsx('glass-card p-6', className)}>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-dark-200 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-500">{t('activity.noActivity')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('glass-card overflow-hidden', className)}>
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gym-400" />
              <h3 className="font-semibold text-white">{headerTitle || t('activity.feedTitle')}</h3>
            </div>
            {activities.length > maxItems && (
              <span className="text-xs text-gray-400">{t('activity.nTotal', { n: activities.length })}</span>
            )}
          </div>
        </div>
      )}
      
      <div className="p-4">
        {/* Timeline line */}
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gym-500 via-purple-500 to-transparent" />
          
          <div className="space-y-4">
            {visibleItems.map((activity, index) => (
              <ActivityItem 
                key={activity.id || index}
                activity={activity}
                index={index}
              />
            ))}
          </div>
        </div>

        {activities.length > maxItems && (
          <div className="mt-4 pt-4 border-t border-gray-800/50 text-center">
            <button className="text-sm text-gym-400 hover:text-gym-300 transition-colors">
              {t('activity.viewAll')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ activity, index }) {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const iconMap = {
    'user_added': UserPlus,
    'payment': DollarSign,
    'expiry_warning': Clock,
    'checkin': UserCheck,
    'renewal': CheckCircle,
    'alert': AlertTriangle,
    'subscription': CreditCard,
    'growth': TrendingUp,
  };

  const colorMap = {
    'user_added': 'from-blue-500 to-cyan-500',
    'payment': 'from-green-500 to-emerald-500',
    'expiry_warning': 'from-yellow-500 to-orange-500',
    'checkin': 'from-purple-500 to-pink-500',
    'renewal': 'from-green-500 to-teal-500',
    'alert': 'from-red-500 to-rose-500',
    'subscription': 'from-gym-500 to-purple-500',
    'growth': 'from-emerald-500 to-green-500',
  };

  const Icon = iconMap[activity.type] || Activity;
  const gradientClass = colorMap[activity.type] || 'from-gray-500 to-gray-600';

  return (
    <div 
      className={clsx(
        'relative flex items-start gap-4 pl-10 transition-all duration-300',
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      )}
    >
      {/* Timeline dot */}
      <div className={clsx(
        'absolute left-3 w-4 h-4 rounded-full bg-gradient-to-br border-2 border-dark-100 shadow-lg',
        gradientClass
      )} />
      
      <div className="flex-1 p-3 bg-dark-200/50 rounded-xl hover:bg-dark-200 transition-colors">
        <div className="flex items-start gap-3">
          <div className={clsx("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", gradientClass)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white">
              {activity.msgKey ? t(activity.msgKey, activity.msgVars) : activity.message}
            </p>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <span>{activity.time || t('time.justNow')}</span>
              {activity.metadata && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400 truncate">{activity.metadata}</span>
                </>
              )}
            </p>
          </div>
          {activity.badge && (
            <span className={clsx(
              'text-xs font-medium px-2 py-1 rounded-full',
              activity.badgeType === 'success' ? 'bg-green-500/20 text-green-400' :
              activity.badgeType === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
              activity.badgeType === 'danger' ? 'bg-red-500/20 text-red-400' :
              'bg-gym-500/20 text-gym-400'
            )}>
              {activity.badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Pre-configured activity types for easy use
export const activityTypes = {
  newMember: (name) => ({
    type: 'user_added',
    message: `New member: ${name}`,
  }),
  payment: (amount, customer) => ({
    type: 'payment',
    message: `Payment received: ${amount}`,
    metadata: customer,
  }),
  checkIn: (name) => ({
    type: 'checkin',
    message: `${name} checked in`,
  }),
  expiryWarning: (count) => ({
    type: 'expiry_warning',
    message: `${count} memberships expiring soon`,
  }),
  renewal: (name, plan) => ({
    type: 'renewal',
    message: `${name} renewed ${plan} plan`,
  }),
};

export default ActivityFeed;