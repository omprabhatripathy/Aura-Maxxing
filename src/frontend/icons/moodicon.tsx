import type { Mood } from '../../backend/models';
import { MOOD_META } from './moodMeta';
import './moodicon.css';

interface MoodIconProps {
  mood: Mood;
  size?: number;
  className?: string;
}

export default function MoodIcon({ mood, size = 28, className = '' }: MoodIconProps) {
  const { Icon, label } = MOOD_META[mood];
  return <Icon size={size} className={`mood-icon-neon ${className}`} aria-label={label} role="img" />;
}
