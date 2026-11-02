import type { ComponentType, SVGProps } from 'react';
import {
  AnalyticsIcon,
  ExpensesIcon,
  GoalsIcon,
  HabitsIcon,
  HealthIcon,
  HomeIcon,
  JournalIcon,
  LogoutIcon,
  PomodoroIcon,
  ProfileIcon,
  ScheduleIcon,
  SettingsIcon,
  TodoIcon,
  TrackersIcon,
} from '../components/shared/icons';

export interface WheelNode {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Route to open; nodes without one run an action (logout). */
  to?: string;
  /** Neon accent; a second stop makes it a gradient. */
  color: [string, string?];
}

/**
 * Corner wheel rings, innermost first. Within a ring, items run from the left edge (9 o'clock)
 * up to 12 o'clock, so the last items sit right above the trigger, closest to the thumb.
 */
export const WHEEL_RINGS: WheelNode[][] = [
  [{ id: 'home', label: 'Home', icon: HomeIcon, to: '/', color: ['#a855f7', '#6366f1'] }],
  [
    { id: 'logout', label: 'Logout', icon: LogoutIcon, color: ['#f87171'] },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, to: '/settings', color: ['#a78bfa'] },
    { id: 'profile', label: 'Profile', icon: ProfileIcon, to: '/profile', color: ['#a78bfa'] },
    { id: 'trackers', label: 'Trackers', icon: TrackersIcon, to: '/trackers', color: ['#22d3ee'] },
    { id: 'health', label: 'Health Hub', icon: HealthIcon, to: '/health', color: ['#ec4899', '#a855f7'] },
  ],
  [
    { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon, to: '/analytics', color: ['#38bdf8'] },
    { id: 'expenses', label: 'Expenses', icon: ExpensesIcon, to: '/expenses', color: ['#2dd4bf', '#10b981'] },
    { id: 'schedule', label: 'Daily Schedule', icon: ScheduleIcon, to: '/schedule', color: ['#818cf8', '#6366f1'] },
    { id: 'pomodoro', label: 'Pomodoro', icon: PomodoroIcon, to: '/pomodoro', color: ['#f43f5e', '#fb7185'] },
    { id: 'journal', label: 'Journal', icon: JournalIcon, to: '/journal', color: ['#3b82f6'] },
    { id: 'goals', label: 'Goals', icon: GoalsIcon, to: '/goals', color: ['#f59e0b'] },
    { id: 'habits', label: 'Habits', icon: HabitsIcon, to: '/habits', color: ['#22c55e'] },
    { id: 'todo', label: 'Todo', icon: TodoIcon, to: '/todo', color: ['#f97316'] },
  ],
];

/** Which wheel node a route belongs to (sub-pages light up their parent). */
export function nodeForPath(pathname: string): WheelNode | undefined {
  return WHEEL_RINGS.flat().find((n) => n.to && (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));
}

const byId = (id: string) => WHEEL_RINGS.flat().find((n) => n.id === id)!;

/** Desktop sidebar groups — same nodes as the mobile wheel, ordered for a top-down list. */
export const SIDEBAR_SECTIONS: { title: string; items: WheelNode[] }[] = [
  { title: 'Main', items: ['home', 'todo', 'habits', 'goals', 'journal', 'analytics'].map(byId) },
  { title: 'Productivity & money', items: ['pomodoro', 'expenses', 'schedule'].map(byId) },
  { title: 'Wellness', items: ['health', 'trackers'].map(byId) },
  { title: 'Account', items: ['profile', 'settings'].map(byId) },
];

export const LOGOUT_NODE = byId('logout');
