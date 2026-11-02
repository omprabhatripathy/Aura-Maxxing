import { useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { revealVariants, staggerContainer, VIEWPORT, type RevealDirection } from './variants';

interface RevealProps {
  children: ReactNode;
  direction?: RevealDirection;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li';
}

/** Fades/slides its content in the first time it scrolls into view. */
export function Reveal({ children, direction = 'up', delay = 0, className, as = 'div' }: RevealProps) {
  const Tag = motion[as];
  return (
    <Tag className={className} variants={revealVariants(direction, delay)} initial="hidden" whileInView="visible" viewport={VIEWPORT}>
      {children}
    </Tag>
  );
}

/** Staggers the entrance of its `StaggerItem` children. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VIEWPORT}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, direction = 'scale' }: { children: ReactNode; className?: string; direction?: RevealDirection }) {
  return (
    <motion.div className={className} variants={revealVariants(direction)} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}>
      {children}
    </motion.div>
  );
}

/** Background layer that drifts slower than the page for a subtle depth effect. */
export function Parallax({ className, strength = 80 }: { className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, strength]);
  return <motion.div ref={ref} className={className} style={{ y }} aria-hidden="true" />;
}
