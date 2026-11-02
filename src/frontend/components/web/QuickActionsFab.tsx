import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HabitsIcon, HealthIcon, JournalIcon, TodoIcon } from '../shared/icons';
import './QuickActionsFab.css';

const ACTIONS = [
  { label: 'New task', to: '/todo', icon: TodoIcon, color: '#f97316' },
  { label: 'New habit', to: '/habits', icon: HabitsIcon, color: '#22c55e' },
  { label: 'Journal entry', to: '/journal', icon: JournalIcon, color: '#3b82f6' },
  { label: 'Log mood', to: '/health', icon: HealthIcon, color: '#ec4899' },
];

/** Floating "create" button for the web shell. */
export default function QuickActionsFab() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="web-fab" ref={ref}>
      <AnimatePresence>
        {open && (
          <motion.ul className="web-fab__menu" initial="hidden" animate="visible" exit="hidden" variants={{ visible: { transition: { staggerChildren: 0.04, staggerDirection: -1 } }, hidden: {} }}>
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <motion.li key={a.label} variants={{ hidden: { opacity: 0, y: 10, scale: 0.9 }, visible: { opacity: 1, y: 0, scale: 1 } }}>
                  <button
                    type="button"
                    className="web-fab__action"
                    style={{ '--fab-accent': a.color } as CSSProperties}
                    onClick={() => {
                      setOpen(false);
                      navigate(a.to);
                    }}
                  >
                    <span className="web-fab__action-icon">
                      <Icon width={18} height={18} aria-hidden="true" />
                    </span>
                    {a.label}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        className="web-fab__trigger"
        aria-label={open ? 'Close quick actions' : 'Quick actions'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        animate={{ rotate: open ? 45 : 0 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </motion.button>
    </div>
  );
}
