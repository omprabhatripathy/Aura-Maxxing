import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { MotionConfig, motion } from 'framer-motion';
import DesktopSidebar from '../components/web/DesktopSidebar';
import DesktopTopbar from '../components/web/DesktopTopbar';
import QuickActionsFab from '../components/web/QuickActionsFab';
import { pageTransition } from '../animations/variants';
import { useAutoReveal } from '../animations/useAutoReveal';
import { usePrefersReducedMotion } from '../hooks/useDevice';
import { SIDEBAR, type Device } from '../lib/designTokens';
import PageOutlet from './PageOutlet';
import '../styles/web.css';
import './WebShell.css';

interface Props {
  title: string;
  device: Exclude<Device, 'mobile'>;
  setHeaderSlot: (el: HTMLElement | null) => void;
  children?: ReactNode;
}

function readCollapsed(device: Props['device']): boolean {
  const stored = localStorage.getItem(SIDEBAR.storageKey);
  return stored === null ? device === 'tablet' : stored === '1';
}

/** Tablet/desktop chrome: persistent sidebar, sticky top bar, animated page area, quick-action FAB. */
export default function WebShell({ title, device, setHeaderSlot, children }: Props) {
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();
  const [collapsed, setCollapsed] = useState(() => readCollapsed(device));
  const mainRef = useRef<HTMLElement>(null);

  useAutoReveal(mainRef, location.pathname, !reducedMotion);

  const toggle = () => {
    const next = !collapsed;
    localStorage.setItem(SIDEBAR.storageKey, next ? '1' : '0');
    setCollapsed(next);
  };

  const width = collapsed ? SIDEBAR.collapsed : SIDEBAR.expanded;

  return (
    <MotionConfig reducedMotion="user">
      <div className={`web-shell web-shell--${device}`} style={{ '--sidebar-w': `${width}px` } as CSSProperties}>
        <div className="web-shell__ambient" aria-hidden="true" />
        <DesktopSidebar collapsed={collapsed} onToggle={toggle} />
        <div className="web-shell__main">
          <DesktopTopbar title={title} setHeaderSlot={setHeaderSlot} />
          <main className="web-shell__content" ref={mainRef}>
            <motion.div key={location.pathname} className="web-shell__page" variants={pageTransition} initial="initial" animate="enter">
              <PageOutlet />
            </motion.div>
          </main>
        </div>
        <QuickActionsFab />
        {children}
      </div>
    </MotionConfig>
  );
}
