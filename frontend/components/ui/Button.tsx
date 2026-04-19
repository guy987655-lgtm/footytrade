import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

const variantStyles = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  accent: 'bg-accent text-white hover:bg-accent-hover',
  danger: 'bg-danger text-white hover:bg-danger-hover',
  ghost: 'bg-transparent text-foreground hover:bg-card-hover',
} as const;

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          variantStyles[variant],
          sizeStyles[size],
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
export default Button;
