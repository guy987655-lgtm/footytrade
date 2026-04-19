import { cn } from '@/lib/utils';

const variantStyles = {
  default: 'bg-primary/20 text-primary',
  accent: 'bg-accent/20 text-accent',
  danger: 'bg-danger/20 text-danger',
  muted: 'bg-muted/20 text-muted',
} as const;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantStyles;
}

export default function Badge({
  variant = 'default',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
