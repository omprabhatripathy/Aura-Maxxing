import type{ SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const HomeIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
);

export const HabitsIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5 11 15l4.5-5.5" />
  </svg>
);

export const GoalsIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

export const JournalIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 4h9a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 1-2Z" />
    <path d="M9 9h6M9 13h6" />
  </svg>
);

export const MenuIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const LoginIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M10 17l5-5-5-5" />
    <path d="M15 12H4" />
    <path d="M4 5v14" />
  </svg>
);

export const RegisterIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5" />
    <path d="M19 5v6M16 8h6" />
  </svg>
);

export const PeriodIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l3 2" />
  </svg>
);