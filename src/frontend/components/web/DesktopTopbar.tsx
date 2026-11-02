import UserProfile from '../shared/UserProfile';
import { formatDate, todayIso } from '../../../backend/core/dates';
import './DesktopTopbar.css';

interface Props {
  title: string;
  setHeaderSlot: (el: HTMLElement | null) => void;
}

export default function DesktopTopbar({ title, setHeaderSlot }: Props) {
  return (
    <header className="web-topbar">
      <div className="web-topbar__lead">
        <nav className="web-topbar__crumbs" aria-label="Breadcrumb">
          <span>Aura</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>
        <h1 className="web-topbar__title">{title}</h1>
      </div>
      <div className="web-topbar__actions">
        <span className="web-topbar__date">{formatDate(todayIso(), { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <div className="web-topbar__slot" ref={setHeaderSlot} />
        <UserProfile />
      </div>
    </header>
  );
}
