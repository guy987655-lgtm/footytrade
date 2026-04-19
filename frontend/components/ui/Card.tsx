import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-card p-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}
