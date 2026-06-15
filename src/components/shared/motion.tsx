'use client';

import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Single shared easing curve for a cohesive, premium feel across every page.
 * All transitions below derive from EASE so curves never drift between pages.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Shared easing/transition presets. */
export const transitions = {
  smooth: { duration: 0.5, ease: EASE },
  quick: { duration: 0.3, ease: EASE },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: transitions.smooth },
};

/** Plain fade (no translate) — for elements where a slide would shift layout. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitions.smooth },
};

/** Subtle scale-in for cards/badges that should feel tactile, not jumpy. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  show: { opacity: 1, scale: 1, transition: transitions.quick },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

interface MotionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Page-level fade/slide-in wrapper. Respects prefers-reduced-motion via the
 * app-shell <MotionConfig reducedMotion="user">, which neutralizes the y/scale
 * transforms while keeping a gentle opacity fade.
 */
export function PageTransition({ children, className }: MotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.smooth}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

/** Staggered reveal container; pair with <StaggerItem>. */
export function StaggerGroup({ children, className }: MotionProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: MotionProps) {
  return (
    <motion.div variants={fadeInUp} className={cn(className)}>
      {children}
    </motion.div>
  );
}
