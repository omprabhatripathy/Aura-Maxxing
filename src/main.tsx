import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import { AuthProvider } from './frontend/context/AuthContext';
import { DataProvider } from './frontend/context/DataContext';
import { ToastProvider } from './frontend/components/shared/feedback/Toast';
import './frontend/styles/global.css';

// Cached theme avoids a flash before the user's saved preference loads.
const storedTheme = localStorage.getItem('aura-theme');
if (storedTheme) {
  document.documentElement.setAttribute('data-theme', storedTheme);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);

