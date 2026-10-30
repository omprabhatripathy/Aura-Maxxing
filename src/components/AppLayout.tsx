import { Outlet } from 'react-router-dom';
import NavMenu from './NavMenu';
import './AppLayout.css';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <NavMenu />
      <main className="app-content">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
