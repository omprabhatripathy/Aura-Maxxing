import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AppLayout from './components/AppLayout';

import Home from './pages/home';
import Habits from './pages/habits';
import Goals from './pages/goals';
import Journal from './pages/journal';

import Login from './pages/auth/login';
import Register from './pages/auth/register';
import Gender from './pages/auth/gender';

import PeriodTracker from './pages/periodtracker';

export default function App() {
  return (
    <BrowserRouter>
    <Routes>

    {/* Public routes */}
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route
      path="/gender"
      element={<Gender onSelect={() => {}} />}
    />

    {/* Protected routes */}
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/period-tracker" element={<PeriodTracker />} />
      </Route>
    </Route>

  </Routes>
</BrowserRouter>
  );
}

