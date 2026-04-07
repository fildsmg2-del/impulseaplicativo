import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'gold' | 'dark';
  delay?: number;
}

export function KPICard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  variant = 'default',
  delay = 0,
}: KPICardProps) {
  const isPositive = trend && trend > 0;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.02] hover:shadow-lg',
        variant === 'default' && 'bg-card border border-border shadow-impulse',
        variant === 'gold' && 'gradient-gold text-impulse-dark',
        variant === 'dark' && 'gradient-impulse text-primary-foreground'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Decorative Background */}
      <div
        className={cn(
          'absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10',
          variant === 'default' && 'bg-impulse-gold',
          variant === 'gold' && 'bg-impulse-dark',
          variant === 'dark' && 'bg-impulse-gold'
        )}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p
              className={cn(
                'text-sm font-medium mb-1',
                variant === 'default' && 'text-muted-foreground',
                variant === 'gold' && 'text-impulse-dark/70',
                variant === 'dark' && 'text-primary-foreground/70'
              )}
            >
              {title}
            </p>
            <p className="text-3xl font-bold tracking-tight animate-count-up">
              {value}
            </p>
          </div>
          <div
            className={cn(
              'p-3 rounded-xl',
              variant === 'default' && 'bg-impulse-gold/10 text-impulse-gold',
              variant === 'gold' && 'bg-impulse-dark/10 text-impulse-dark',
              variant === 'dark' && 'bg-impulse-gold/20 text-impulse-gold'
            )}
          >
            {icon}
          </div>
        </div>

        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-4">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span
              className={cn(
                'text-sm font-medium',
                isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {isPositive ? '+' : ''}
              {trend}%
            </span>
            {trendLabel && (
              <span
                className={cn(
                  'text-xs',
                  variant === 'default' && 'text-muted-foreground',
                  variant !== 'default' && 'opacity-70'
                )}
              >
                {trendLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
