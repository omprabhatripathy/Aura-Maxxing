import type { Habit, HabitCategory } from '../../backend/models';

export const CATEGORY_EMOJI: Record<HabitCategory, string> = {
  health: '🏃',
  learning: '📖',
  productivity: '💻',
  mindset: '🧘',
  social: '🤝',
};

export interface EmojiGroup {
  group: string;
  emojis: string[];
}

// Matched against words in each emoji's official name (e.g. "person_running").
const GROUP_KEYWORDS: { group: string; keywords: string[] }[] = [
  { group: 'Health', keywords: ['running', 'swimming', 'biking', 'lifting', 'climbing', 'skier', 'surfing', 'rowing', 'biceps', 'tooth', 'apple', 'carrot', 'broccoli', 'salad', 'avocado', 'banana', 'droplet', 'sleeping', 'bed', 'pill', 'syringe', 'stethoscope'] },
  { group: 'Learning', keywords: ['book', 'books', 'notebook', 'ledger', 'pencil', 'writing', 'graduation', 'school', 'microscope', 'telescope', 'test', 'dna', 'abacus', 'palette', 'guitar', 'violin', 'trumpet', 'saxophone', 'globe', 'bulb', 'puzzle', 'scroll', 'memo', 'speaking'] },
  { group: 'Productivity', keywords: ['laptop', 'desktop', 'keyboard', 'calendar', 'chart', 'clipboard', 'pushpin', 'briefcase', 'money', 'bank', 'alarm', 'stopwatch', 'hourglass', 'check', 'hit', 'rocket', 'gear', 'hammer', 'wrench', 'inbox', 'file', 'notepad'] },
  { group: 'Mindset', keywords: ['lotus', 'folded', 'brain', 'sun', 'sunrise', 'crescent', 'glowing', 'sparkles', 'dove', 'herb', 'seedling', 'leaf', 'blossom', 'tulip', 'sunflower', 'rainbow', 'peace', 'yin', 'candle', 'crystal', 'purple'] },
  { group: 'Social', keywords: ['handshake', 'hugging', 'waving', 'raising', 'clapping', 'people', 'family', 'couple', 'holding', 'partying', 'party', 'confetti', 'gift', 'speech', 'telephone', 'busts', 'birthday', 'clinking'] },
];

const PER_GROUP = 30;
const FLAG_OR_ZWJ = /[\u{1F1E6}-\u{1F1FF}\u200D]/u;

let cached: Promise<EmojiGroup[]> | null = null;

/** Emoji groups per habit category, sourced from the emojilib keyword dataset. */
export function loadHabitEmojis(): Promise<EmojiGroup[]> {
  cached ??= import('emojilib').then(({ default: lib }) => {
    const entries = Object.entries(lib).filter(([emoji]) => !FLAG_OR_ZWJ.test(emoji));
    return GROUP_KEYWORDS.map(({ group, keywords }) => {
      const wanted = new Set(keywords);
      const emojis = entries
        .filter(([, [name = '']]) => name.split('_').some((t) => wanted.has(t)))
        .slice(0, PER_GROUP)
        .map(([emoji]) => emoji);
      return { group, emojis };
    });
  });
  return cached;
}

/** The habit's chosen emoji, falling back to its category icon. */
export function habitIcon(habit: Pick<Habit, 'emoji' | 'category'>): string {
  return habit.emoji || CATEGORY_EMOJI[habit.category];
}
