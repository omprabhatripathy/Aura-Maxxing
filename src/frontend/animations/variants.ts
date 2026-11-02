import type { Variants } from 'framer-motion';
import { MOTION } from '../lib/designTokens';

export type RevealDirection = 'up' | 'left' | 'right' | 'scale' | 'fade';

const OFFSET = 24;

const hidden: Record<RevealDirection, Record<string, number>> = {
  up: { opacity: 0, y: OFFSET },
  left: { opacity: 0, x: -OFFSET },
  right: { opacity: 0, x: OFFSET },
  scale: { opacity: 0, scale: 0.94 },
  fade: { opacity: 0 },
};

export function revealVariants(direction: RevealDirection = 'up', delay = 0): Variants {
  return {
    hidden: hidden[direction],
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { duration: MOTION.slow, ease: MOTION.ease, delay },
    },
  };
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: MOTION.stagger, delayChildren: 0.04 } },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: MOTION.base, ease: MOTION.ease } },
  exit: { opacity: 0, y: -8, transition: { duration: MOTION.fast, ease: MOTION.ease } },
};

/** Trigger once when 15% of the element is visible. */
export const VIEWPORT = { once: true, amount: 0.15 } as const;
