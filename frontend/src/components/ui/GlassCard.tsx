import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { glassCardVariants } from '@/lib/animations';

export type GlowColor = 'blue' | 'yellow' | 'none';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  glow?: GlowColor;
  hover?: boolean;
  className?: string;
  as?: 'div' | 'article' | 'section';
}

const glowStyles: Record<GlowColor, string> = {
  blue: 'hover:shadow-[0_0_30px_rgba(75,139,190,0.15)]',
  yellow: 'hover:shadow-[0_0_30px_rgba(255,212,59,0.15)]',
  none: '',
};

/**
 * GlassCard - Premium glassmorphism card component
 * 
 * Features:
 * - Backdrop blur effect
 * - Subtle border that brightens on hover
 * - Optional glow effect (Python blue or yellow)
 * - Smooth hover animations via Framer Motion
 * 
 * @example
 * <GlassCard glow="blue">
 *   <h3>Search Result</h3>
 *   <p>Code snippet here...</p>
 * </GlassCard>
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      glow = 'none',
      hover = true,
      className,
      as = 'div',
      ...props
    },
    ref
  ) => {
    const Component = motion[as] as typeof motion.div;

    return (
      <Component
        ref={ref}
        className={cn(
          // Base glass styles
          'rounded-xl',
          'bg-white/[0.03]',
          'backdrop-blur-xl',
          'border border-white/[0.08]',
          // Transitions
          'transition-all duration-normal ease-out-expo',
          // Hover effects
          hover && [
            'hover:bg-white/[0.05]',
            'hover:border-white/[0.12]',
          ],
          // Glow effect
          glow !== 'none' && glowStyles[glow],
          className
        )}
        variants={hover ? glassCardVariants : undefined}
        initial={hover ? 'idle' : undefined}
        whileHover={hover ? 'hover' : undefined}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassCard.displayName = 'GlassCard';

// Convenience wrapper for content padding
interface GlassCardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingSizes = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const GlassCardContent = ({
  children,
  padding = 'md',
  className,
  ...props
}: GlassCardContentProps) => (
  <div className={cn(paddingSizes[padding], className)} {...props}>
    {children}
  </div>
);

// Header with border
export const GlassCardHeader = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'px-4 py-3',
      'border-b border-white/[0.08]',
      'flex items-center justify-between',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// Footer with border
export const GlassCardFooter = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'px-4 py-3',
      'border-t border-white/[0.08]',
      'flex items-center gap-2',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export default GlassCard;
