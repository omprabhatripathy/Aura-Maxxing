import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { WHEEL_RINGS, nodeForPath, type WheelNode } from '../../lib/nav-items';
import { labelForSegment } from '../../lib/routes';
import { CloseIcon, MenuIcon } from '../shared/icons';
import ConfirmDialog from '../shared/ConfirmDialog';
import { useLogout } from '../../hooks/useLogout';
import './NavMenu.css';

/** Ring radius as a share of the outer ring, and node size per ring (innermost first). */
const RING_SHARE = [0.3, 0.62, 1];
const NODE_SIZE = [62, 44, 46];
const ARC_START = 0;
const ARC_END = 90;

function outerRadius(width: number, height: number) {
  return Math.round(Math.min(300, Math.max(210, Math.min(width - 70, height - 150))));
}

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [outer, setOuter] = useState(() => (typeof window === 'undefined' ? 280 : outerRadius(window.innerWidth, window.innerHeight)));
  const wheelRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const logout = useLogout(() => setOpen(false));

  const active = nodeForPath(location.pathname);
  const caption = active?.label ?? labelForSegment(location.pathname.split('/')[1] ?? '');
  const scale = Math.min(1, Math.max(0.82, outer / 290));

  useEffect(() => {
    const onResize = () => setOuter(outerRadius(window.innerWidth, window.innerHeight));
    const onClick = (e: MouseEvent) => wheelRef.current && !wheelRef.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  let order = 0;
  const placed = WHEEL_RINGS.flatMap((ring, r) =>
    ring.map((node, i) => {
      const angle = ring.length === 1 ? 45 : ARC_START + ((ARC_END - ARC_START) * i) / (ring.length - 1);
      const radius = outer * RING_SHARE[r];
      const rad = (angle * Math.PI) / 180;
      return { node, ring: r, x: -radius * Math.cos(rad), y: -radius * Math.sin(rad), index: order++ };
    })
  );

  const itemProps = (p: (typeof placed)[number]) => ({
    title: p.node.label,
    'aria-label': p.node.label,
    tabIndex: open ? 0 : -1,
    'aria-hidden': !open,
    style: {
      '--x': `${p.x}px`,
      '--y': `${p.y}px`,
      '--i': p.index,
      '--size': `${NODE_SIZE[p.ring] * scale}px`,
      '--c1': p.node.color[0],
      '--c2': p.node.color[1] ?? p.node.color[0],
    } as CSSProperties,
    onMouseEnter: () => setHovered(p.node.label),
    onMouseLeave: () => setHovered(null),
    onFocus: () => setHovered(p.node.label),
    onBlur: () => setHovered(null),
  });

  const content = (node: WheelNode) => {
    const Icon = node.icon;
    return (
      <>
        <span className="nav-wheel__bubble">
          <Icon />
        </span>
        <span className="nav-wheel__label">{node.label}</span>
      </>
    );
  };

  return (
    <>
      <div className={`nav-wheel-backdrop${open ? ' nav-wheel-backdrop--open' : ''}`} aria-hidden="true" />

      <div className={`nav-wheel${open ? ' nav-wheel--open' : ''}`} ref={wheelRef} style={{ '--R': `${outer}px` } as CSSProperties}>
        <div className="nav-wheel__disc" aria-hidden="true">
          {RING_SHARE.map((share, i) => (
            <span key={share} className={`nav-wheel__ring nav-wheel__ring--${i + 1}`} style={{ '--rr': `${outer * share}px` } as CSSProperties} />
          ))}
        </div>

        <nav aria-label="Primary" className="nav-wheel__items">
          {placed.map((p) =>
            p.node.to ? (
              <NavLink
                key={p.node.id}
                to={p.node.to}
                end={p.node.to === '/'}
                {...itemProps(p)}
                className={({ isActive }) => `nav-wheel__item nav-wheel__item--ring${p.ring + 1}${isActive || active?.id === p.node.id ? ' nav-wheel__item--active' : ''}`}
                onClick={() => setOpen(false)}
              >
                {content(p.node)}
              </NavLink>
            ) : (
              <button key={p.node.id} type="button" {...itemProps(p)} className={`nav-wheel__item nav-wheel__item--ring${p.ring + 1} nav-wheel__item--logout`} onClick={logout.request}>
                {content(p.node)}
              </button>
            )
          )}
        </nav>

        <button type="button" className="nav-wheel__trigger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="nav-wheel__trigger-icon">{open ? <CloseIcon /> : <MenuIcon />}</span>
        </button>

        <span className="nav-wheel__caption" aria-live="polite">
          {open ? hovered ?? caption ?? 'Navigate' : caption || 'Aura'}
        </span>
      </div>

      {logout.confirming && (
        <ConfirmDialog
          title="Log out?"
          message="Are you sure you want to log out of your account?"
          confirmLabel="Logout"
          onConfirm={logout.confirm}
          onCancel={logout.cancel}
        />
      )}
    </>
  );
}
