import { useState, forwardRef } from 'react';
import clsx from 'clsx';

/**
 * GradientButton Component
 * Buttons with beautiful gradient effects
 */
export const GradientButton = forwardRef(({
  children,
  variant = 'primary', // 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'cyan'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);

  const variants = {
    primary: {
      gradient: 'from-gym-500 to-purple-600',
      hover: 'hover:from-gym-400 hover:to-purple-500',
      shadow: 'shadow-gym-500/30',
      hoverShadow: 'hover:shadow-gym-500/50',
      text: 'text-white',
    },
    success: {
      gradient: 'from-green-500 to-emerald-600',
      hover: 'hover:from-green-400 hover:to-emerald-500',
      shadow: 'shadow-green-500/30',
      hoverShadow: 'hover:shadow-green-500/50',
      text: 'text-white',
    },
    warning: {
      gradient: 'from-yellow-500 to-orange-600',
      hover: 'hover:from-yellow-400 hover:to-orange-500',
      shadow: 'shadow-yellow-500/30',
      hoverShadow: 'hover:shadow-yellow-500/50',
      text: 'text-black',
    },
    danger: {
      gradient: 'from-red-500 to-rose-600',
      hover: 'hover:from-red-400 hover:to-rose-500',
      shadow: 'shadow-red-500/30',
      hoverShadow: 'hover:shadow-red-500/50',
      text: 'text-white',
    },
    purple: {
      gradient: 'from-purple-500 to-pink-600',
      hover: 'hover:from-purple-400 hover:to-pink-500',
      shadow: 'shadow-purple-500/30',
      hoverShadow: 'hover:shadow-purple-500/50',
      text: 'text-white',
    },
    cyan: {
      gradient: 'from-cyan-500 to-blue-600',
      hover: 'hover:from-cyan-400 hover:to-blue-500',
      shadow: 'shadow-cyan-500/30',
      hoverShadow: 'hover:shadow-cyan-500/50',
      text: 'text-white',
    },
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const v = variants[variant];
  const s = sizes[size];

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-xl',
        'bg-gradient-to-r transition-all duration-300',
        v.gradient,
        v.hover,
        v.shadow,
        v.hoverShadow,
        v.text,
        s,
        disabled && 'opacity-50 cursor-not-allowed',
        loading && 'cursor-wait',
        !disabled && !loading && 'active:scale-95',
        isHovered && !disabled && !loading && 'scale-105',
        className
      )}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
        </>
      )}
    </button>
  );
});

GradientButton.displayName = 'GradientButton';

export default GradientButton;