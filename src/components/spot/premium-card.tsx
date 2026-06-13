import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * PremiumCard — a glassy, elevated surface primitive used across the app for
 * high-end consumer feel. Purely presentational.
 */
export const PremiumCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'surface-glass rounded-lg shadow-premium transition-shadow duration-300',
      'hover:shadow-glow',
      className
    )}
    {...props}
  />
));
PremiumCard.displayName = 'PremiumCard';
