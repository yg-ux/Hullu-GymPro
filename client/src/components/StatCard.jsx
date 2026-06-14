import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { AnimatedCounter } from './AnimatedCounter';

/**
 * StatCard Component
 * Dashboard stat cards with icon, animated counter, and trend
 */
export function StatCard({ 
  title,
  value,
  icon: Icon,
  color = 'blue', // 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gym'
  trend,
  trendDirection = 'up', // 'up' | 'down' | 'neutral'
  prefix = '',
  suffix = '',
  decimals = 0,
  animationDelay = 0,
  className = ''
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const colors = {
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/15',
      iconText: 'text-blue-400',
      trendUp: 'text-blue-400',
      trendDown: 'text-red-400'
    },
    green: {
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      border: 'border-green-500/30',
      iconBg: 'bg-green-500/15',
      iconText: 'text-green-400',
      trendUp: 'text-green-400',
      trendDown: 'text-red-400'
    },
    yellow: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      iconBg: 'bg-yellow-500/15',
      iconText: 'text-yellow-400',
      trendUp: 'text-green-400',
      trendDown: 'text-yellow-400'
    },
    red: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
      iconBg: 'bg-red-500/15',
      iconText: 'text-red-400',
      trendUp: 'text-green-400',
      trendDown: 'text-red-400'
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      iconBg: 'bg-purple-500/15',
      iconText: 'text-purple-400',
      trendUp: 'text-purple-400',
      trendDown: 'text-red-400'
    },
    gym: {
      bg: 'bg-gym-500/10',
      text: 'text-gym-400',
      border: 'border-gym-500/30',
      iconBg: 'bg-gym-500/15',
      iconText: 'text-gym-400',
      trendUp: 'text-gym-400',
      trendDown: 'text-red-400'
    },
  };

  const c = colors[color] || colors.blue;

  return (
    <div
      ref={ref}
      className={clsx(
        'glass-card p-5 border transition-all duration-500 hover-lift',
        c.border,
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
      style={{ transitionDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-2">{title}</p>
          <div className="flex items-baseline gap-1">
            {prefix && <span className="text-lg text-gray-400">{prefix}</span>}
            <AnimatedCounter 
              value={value} 
              suffix={suffix}
              decimals={decimals}
              trigger="intersection"
              className="text-3xl font-bold text-white"
            />
          </div>
          {trend && (
            <p className={clsx(
              'text-xs mt-2 flex items-center gap-1',
              trendDirection === 'up' ? c.trendUp : trendDirection === 'down' ? c.trendDown : 'text-gray-500'
            )}>
              {trendDirection === 'up' && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {trendDirection === 'down' && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={clsx('p-3 rounded-xl', c.iconBg)}>
            <Icon className={clsx('w-6 h-6', c.iconText)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;