import type { IconType } from 'react-icons';
import {
  WiCloud,
  WiDaySunny,
  WiFire,
  WiHot,
  WiLightning,
  WiMoonAltWaningCrescent3,
  WiRain,
  WiRaindrop,
  WiStars,
  WiStrongWind,
  WiSunrise,
  WiThunderstorm,
} from 'react-icons/wi';
import { CYCLE_MOOD_LABEL, type CycleMood } from '../../backend/period/types';
import './moodicon.css';

const ICONS: Record<CycleMood, IconType> = {
  happy: WiDaySunny,
  calm: WiStars,
  energetic: WiLightning,
  motivated: WiSunrise,
  neutral: WiCloud,
  sensitive: WiRaindrop,
  irritable: WiHot,
  anxious: WiStrongWind,
  sad: WiRain,
  overwhelmed: WiThunderstorm,
  'low-energy': WiMoonAltWaningCrescent3,
  angry: WiFire,
};

export default function CycleMoodIcon({ mood, size = 26 }: { mood: CycleMood; size?: number }) {
  const Icon = ICONS[mood];
  return <Icon size={size} className="mood-icon-neon" aria-hidden="true" title={CYCLE_MOOD_LABEL[mood]} />;
}
