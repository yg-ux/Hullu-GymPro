import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

/**
 * GlassCard Component
 * A reusable card with glassmorphism effect
 */
export function GlassCard({ 
  children, 
  className = '', 
  hover = true,
  glow = false,
  glowColor = 'gym',
  padding = 'p-6',
  onClick,
  animated = true,
  animationDelay = 0
}) {
  const [isVisible, setIsVisible] = useState(!animated);
  const ref = useRef(null);

  useEffect(() => {
    if (!animated) {
      setIsVisible(true);
      return;
    }

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
  }, [animated]);

  const glowColors = {
    gym: 'shadow-gym-500/20',
    green: 'shadow-green-500/20',
    blue: 'shadow-blue-500/20',
    purple: 'shadow-purple-500/20',
    yellow: 'shadow-yellow-500/20',
    red: 'shadow-red-500/20',
  };

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={clsx(
        'glass-card',
        padding,
        glow && glowColors[glowColor],
        hover && 'hover-lift cursor-pointer',
        animated && !isVisible && 'opacity-0 translate-y-4',
        animated && isVisible && 'animate-slide-up',
        onClick && 'cursor-pointer',
        className
      )}
      style={animated ? { transitionDelay: `${animationDelay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export default GlassCard;