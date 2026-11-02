import type { IconType } from 'react-icons';
import { WiDaySunny, WiLightning, WiStars, WiCloud, WiRain, WiThunderstorm } from 'react-icons/wi';
import type { Mood } from '../../backend/models';

export const MOOD_META: Record<Mood, { label: string; Icon: IconType }> = {
  happy: { label: 'Happy', Icon: WiDaySunny },
  energetic: { label: 'Energetic', Icon: WiLightning },
  calm: { label: 'Calm', Icon: WiStars },
  neutral: { label: 'Neutral', Icon: WiCloud },
  low: { label: 'Low', Icon: WiRain },
  stressed: { label: 'Stressed', Icon: WiThunderstorm },
};

export const MOOD_ORDER: Mood[] = ['happy', 'energetic', 'calm', 'neutral', 'low', 'stressed'];

const SCORE_TO_MOOD: Record<number, Mood> = { 5: 'happy', 4: 'energetic', 3: 'neutral', 2: 'low', 1: 'stressed' };

export function moodFromScore(score: number): Mood {
  return SCORE_TO_MOOD[Math.min(5, Math.max(1, Math.round(score)))];
}
