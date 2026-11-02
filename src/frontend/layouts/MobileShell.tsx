import type { ReactNode } from 'react';
import NavMenu from '../components/mobile/NavMenu';
import UserProfile from '../components/shared/UserProfile';
import BackButton from '../components/shared/BackButton';
import PageOutlet from './PageOutlet';
import './AppLayout.css';

interface Props {
  title: string;
  setHeaderSlot: (el: HTMLElement | null) => void;
  children?: ReactNode;
}

/** The original phone layout: compact top bar + corner navigation wheel. */
export default function MobileShell({ title, setHeaderSlot, children }: Props) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar__inner">
          <div className="app-topbar__lead">
            <BackButton />
            <span className="app-topbar__title">{title}</span>
          </div>
          <div className="app-topbar__actions">
            <div className="app-topbar__slot" ref={setHeaderSlot} />
            <UserProfile />
          </div>
        </div>
      </header>
      <NavMenu />
      <main className="app-content">
        <div className="container">
          <PageOutlet />
        </div>
      </main>
      {children}
    </div>
  );
}
