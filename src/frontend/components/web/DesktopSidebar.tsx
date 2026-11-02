import { useLocation, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { SIDEBAR_SECTIONS, LOGOUT_NODE, nodeForPath } from '../../lib/nav-items';
import { useLogout } from '../../hooks/useLogout';
import ConfirmDialog from '../shared/ConfirmDialog';
import './DesktopSidebar.css';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const accent = (c: [string, string?]) => ({ '--nav-accent': c[0], '--nav-accent-2': c[1] ?? c[0] }) as CSSProperties;

/** Persistent web navigation: icon + label, collapsible to an icon rail. */
export default function DesktopSidebar({ collapsed, onToggle }: Props) {
  const location = useLocation();
  const active = nodeForPath(location.pathname);
  const logout = useLogout();
  const LogoutIcon = LOGOUT_NODE.icon;

  return (
    <aside className={`web-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Main navigation">
      <div className="web-sidebar__brand">
        <span className="web-sidebar__logo" aria-hidden="true">A</span>
        <span className="web-sidebar__brand-text">Aura Maxxing</span>
      </div>

      <nav className="web-sidebar__nav">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title} className="web-sidebar__section">
            <p className="web-sidebar__section-title">{section.title}</p>
            <ul>
              {section.items.map((node) => {
                const Icon = node.icon;
                const isActive = active?.id === node.id;
                return (
                  <li key={node.id}>
                    <NavLink
                      to={node.to!}
                      end={node.to === '/'}
                      className={`web-sidebar__link${isActive ? ' is-active' : ''}`}
                      style={accent(node.color)}
                      title={collapsed ? node.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {isActive && <motion.span layoutId="web-sidebar-active" className="web-sidebar__indicator" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                      <span className="web-sidebar__icon">
                        <Icon width={20} height={20} aria-hidden="true" />
                      </span>
                      <span className="web-sidebar__label">{node.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="web-sidebar__footer">
        <button type="button" className="web-sidebar__link web-sidebar__link--danger" onClick={logout.request} title={collapsed ? 'Logout' : undefined}>
          <span className="web-sidebar__icon">
            <LogoutIcon width={20} height={20} aria-hidden="true" />
          </span>
          <span className="web-sidebar__label">Logout</span>
        </button>
        <button
          type="button"
          className="web-sidebar__collapse"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M9 4v16" />
            <path d={collapsed ? 'M13 10l2 2-2 2' : 'M16 10l-2 2 2 2'} />
          </svg>
        </button>
      </div>

      {logout.confirming && (
        <ConfirmDialog title="Log out?" message="Are you sure you want to log out of your account?" confirmLabel="Logout" onConfirm={logout.confirm} onCancel={logout.cancel} />
      )}
    </aside>
  );
}
