import type { ComponentType, SVGProps } from "react";
import {
  HomeIcon,
  HabitsIcon,
  GoalsIcon,
  JournalIcon,
  LoginIcon,
  RegisterIcon,
  PeriodIcon,
} from "../components/icons";
export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  gender?: string; // optional field to conditionally show items
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/habits', label: 'Habits', icon: HabitsIcon },
  { to: '/goals', label: 'Goals', icon: GoalsIcon },
  { to: '/journal', label: 'Journal', icon: JournalIcon },

  // Auth pages (optional to show in nav)
  { to: '/login', label: 'Login', icon: LoginIcon },
  { to: '/register', label: 'Register', icon: RegisterIcon },

  // Conditionally render Period Tracker if gender = female
  { to: '/period-tracker', label: 'Period Tracker', icon: PeriodIcon, gender: 'female' },
];
