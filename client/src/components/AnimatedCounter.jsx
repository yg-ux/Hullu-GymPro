import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

/**
 * Animated Counter Component
 * Animates numbers from 0 to a target value with various effects
 */
export function AnimatedCounter({ 
  value, 
  duration = 1500, 
  delay = 0, 
  prefix = '', 
  suffix = '',
  decimals = 0,
  className = '',
  trigger = 'intersection' // 'intersection' | 'mount' | 'always'
}) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  // Intersection Observer for scroll-triggered animations
  useEffect(() => {
    if (trigger !== 'intersection') return;
    
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
  }, [trigger]);

  // Auto-start on mount for 'mount' trigger
  useEffect(() => {
    if (trigger === 'mount') {
      setIsVisible(true);
    }
  }, [trigger]);

  useEffect(() => {
    if (!isVisible && trigger === 'intersection') return;
    
    const timeout = setTimeout(() => {
      let startTime = null;
      
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out quart for smooth deceleration
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = easeOutQuart * value;
        
        setCount(decimals > 0 ? currentValue.toFixed(decimals) : Math.floor(currentValue));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(value);
        }
      };
      
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isVisible, value, duration, delay, decimals, trigger]);

  return (
    <span ref={ref} className={clsx('inline-block', className)}>
      {prefix}{typeof count === 'number' ? count.toLocaleString() : count}{suffix}
    </span>
  );
}

export default AnimatedCounter;