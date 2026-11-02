export interface StickerTheme {
  label: string;
  color: string;
}

export const STICKER_THEMES = {
  habits: { label: 'Habits', color: '#22c55e' },
  streaks: { label: 'Streaks', color: '#f97316' },
  goals: { label: 'Goals', color: '#3b82f6' },
  journal: { label: 'Journal', color: '#ec4899' },
  mood: { label: 'Mood', color: '#14b8a6' },
  balance: { label: 'Aura', color: '#eab308' },
} satisfies Record<string, StickerTheme>;

export type StickerThemeKey = keyof typeof STICKER_THEMES;

/** Halo colour matching each badge artwork's dominant tint. */
export const BADGE_GLOW: Record<string, string> = {
  'first-habit': '#10b981',
  'first-completion': '#06b6d4',
  'streak-7': '#a855f7',
  'streak-30': '#f59e0b',
  'completions-100': '#f59e0b',
  'first-goal': '#06b6d4',
  'goal-complete': '#10b981',
  'goals-5': '#f59e0b',
  'first-entry': '#a855f7',
  'entries-10': '#06b6d4',
  'words-5000': '#ec4899',
  'mood-7': '#14b8a6',
  balanced: '#f59e0b',
  'aura-farmer': '#f59e0b',
  'habit-master': '#10b981',
  'goal-crusher': '#3b82f6',
  'journal-veteran': '#ec4899',
  'focus-legend': '#06b6d4',
  'consistency-king': '#f97316',
  'achievement-hunter': '#eab308',
};

export const ACHIEVEMENT_STICKERS: Record<string, { emoji: string; theme: StickerThemeKey }> = {
  'first-habit': { emoji: '🌱', theme: 'habits' },
  'first-completion': { emoji: '✅', theme: 'habits' },
  'completions-100': { emoji: '💯', theme: 'habits' },
  'streak-7': { emoji: '🔥', theme: 'streaks' },
  'streak-30': { emoji: '☄️', theme: 'streaks' },
  'first-goal': { emoji: '🎯', theme: 'goals' },
  'goal-complete': { emoji: '🏁', theme: 'goals' },
  'goals-5': { emoji: '🏆', theme: 'goals' },
  'first-entry': { emoji: '📔', theme: 'journal' },
  'entries-10': { emoji: '🪞', theme: 'journal' },
  'words-5000': { emoji: '✒️', theme: 'journal' },
  'mood-7': { emoji: '🌈', theme: 'mood' },
  balanced: { emoji: '🔮', theme: 'balance' },
  'aura-farmer': { emoji: '🌾', theme: 'balance' },
  'habit-master': { emoji: '🧠', theme: 'habits' },
  'goal-crusher': { emoji: '💥', theme: 'goals' },
  'journal-veteran': { emoji: '📜', theme: 'journal' },
  'focus-legend': { emoji: '🎯', theme: 'goals' },
  'consistency-king': { emoji: '👑', theme: 'streaks' },
  'achievement-hunter': { emoji: '🏆', theme: 'balance' },
};

export function stickerFor(id: string) {
  const s = ACHIEVEMENT_STICKERS[id] ?? { emoji: '⭐', theme: 'balance' as const };
  return { ...s, ...STICKER_THEMES[s.theme] };
}

export { BADGE_XP, badgeTier, LEGENDARY_BADGES } from '../../backend/achievements/engine';
