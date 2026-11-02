export const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  habits: 'Habits',
  todo: 'Todo',
  goals: 'Goals',
  journal: 'Journal',
  profile: 'Profile',
  settings: 'Settings',
  monthly: 'Monthly',
  yearly: 'Yearly',
  trackers: 'Trackers',
  analytics: 'Analytics',
  health: 'Health Hub',
  pomodoro: 'Pomodoro',
  expenses: 'Expenses',
  schedule: 'Daily Schedule',
  'period-tracker': 'Period Tracker',
};

export function labelForSegment(segment: string): string {
  return routeLabels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}
