import { cn } from '@/lib/utils';
import { type InputHTMLAttributes, forwardRef } from 'react';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
export default Input;
