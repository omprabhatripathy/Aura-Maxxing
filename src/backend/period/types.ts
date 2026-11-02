export type Flow = 'spotting' | 'light' | 'medium' | 'heavy';

export type CycleMood =
  | 'happy'
  | 'calm'
  | 'energetic'
  | 'motivated'
  | 'neutral'
  | 'sensitive'
  | 'irritable'
  | 'anxious'
  | 'sad'
  | 'overwhelmed'
  | 'low-energy'
  | 'angry';

export interface SymptomEntry {
  name: string;
  severity: number;
}

export interface DailyLog {
  id: string;
  date: string;
  period?: {
    isPeriodDay: boolean;
    flow: Flow;
    pain: number;
  };
  moods: CycleMood[];
  moodIntensity?: number;
  energyLevel?: number;
  stressLevel?: number;
  symptoms: SymptomEntry[];
  notes?: string;
}

export const FLOW_OPTIONS: { value: Flow; label: string; level: number }[] = [
  { value: 'spotting', label: 'Spotting', level: 1 },
  { value: 'light', label: 'Light', level: 2 },
  { value: 'medium', label: 'Medium', level: 3 },
  { value: 'heavy', label: 'Heavy', level: 4 },
];

export const FLOW_LEVEL: Record<Flow, number> = { spotting: 1, light: 2, medium: 3, heavy: 4 };

// Valence used to turn a day's selected moods into a 1–5 mood score.
export const CYCLE_MOOD_SCORE: Record<CycleMood, number> = {
  happy: 5,
  energetic: 5,
  motivated: 5,
  calm: 4,
  neutral: 3,
  sensitive: 2,
  irritable: 2,
  anxious: 2,
  'low-energy': 2,
  sad: 1,
  overwhelmed: 1,
  angry: 1,
};

export const CYCLE_MOOD_LABEL: Record<CycleMood, string> = {
  happy: 'Happy',
  calm: 'Calm',
  energetic: 'Energetic',
  motivated: 'Motivated',
  neutral: 'Neutral',
  sensitive: 'Sensitive',
  irritable: 'Irritable',
  anxious: 'Anxious',
  sad: 'Sad',
  overwhelmed: 'Overwhelmed',
  'low-energy': 'Low energy',
  angry: 'Angry',
};

export const CYCLE_MOODS = Object.keys(CYCLE_MOOD_LABEL) as CycleMood[];

export const DEFAULT_SYMPTOMS = [
  'Cramps',
  'Bloating',
  'Headache',
  'Fatigue',
  'Acne',
  'Breast tenderness',
  'Back pain',
  'Nausea',
  'Food cravings',
  'Constipation',
  'Diarrhea',
  'Insomnia',
];

export function emptyLog(date: string): DailyLog {
  return { id: date, date, moods: [], symptoms: [] };
}

export function isLogEmpty(log: DailyLog): boolean {
  return (
    !log.period?.isPeriodDay &&
    log.moods.length === 0 &&
    log.symptoms.length === 0 &&
    !log.notes?.trim() &&
    log.moodIntensity === undefined &&
    log.energyLevel === undefined &&
    log.stressLevel === undefined
  );
}
