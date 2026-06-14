import { forwardRef } from 'react';
import clsx from 'clsx';

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

  const variants = {
    primary: 'bg-gym-500 hover:bg-gym-400 text-white',
    success: 'bg-green-600 hover:bg-green-500 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-400 text-black',
    danger:  'bg-red-600 hover:bg-red-500 text-white',
    purple:  'bg-purple-600 hover:bg-purple-500 text-white',
    cyan:    'bg-cyan-600 hover:bg-cyan-500 text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors duration-150',
        variants[variant] || variants.primary,
        sizes[size],
        (disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95',
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
