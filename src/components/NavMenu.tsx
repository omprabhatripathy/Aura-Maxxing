import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { navItems } from '../lib/nav-items';
import { MenuIcon, CloseIcon } from './icons';
import './NavMenu.css';

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu on outside click, and on Escape.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <>
      {/* Desktop: slim left rail, always visible */}
      <nav className="nav-rail surface-level-2-glass" aria-label="Primary">
        <div className="nav-rail__brand glow-primary" aria-hidden="true">
          A
        </div>
        <ul className="nav-rail__list">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `nav-rail__link ${isActive ? 'nav-rail__link--active' : ''}`
                }
                title={label}
              >
                <Icon />
                <span className="nav-rail__label text-label-sm">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile: single floating menu button that expands the feature nav */}
      <div className="nav-fab-wrap" ref={menuRef}>
        {open && (
          <div className="nav-fab-menu surface-level-2-glass" role="menu">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                role="menuitem"
                className={({ isActive }) =>
                  `nav-fab-menu__item ${isActive ? 'nav-fab-menu__item--active' : ''}`
                }
                onClick={() => setOpen(false)}
              >
                <Icon />
                <span className="text-label-md">{label}</span>
              </NavLink>
            ))}
          </div>
        )}
        <button
          type="button"
          className="nav-fab glow-primary"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
    </>
  );
}
