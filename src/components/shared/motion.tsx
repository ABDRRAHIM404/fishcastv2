'use client';

import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Shared easing/transition presets for a cohesive, premium feel. */
export const transitions = {
  smooth: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  quick: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: transitions.smooth },
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

/** Page-level fade/slide-in wrapper. */
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
