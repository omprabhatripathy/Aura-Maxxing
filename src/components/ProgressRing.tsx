import './ProgressRing.css';

interface ProgressRingProps {
  /** 0 - 100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function ProgressRing({
  value,
  size = 96,
  strokeWidth = 4,
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className="aura-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="aura-ring__svg">
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          className="aura-ring__track"
          fill="none"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          className="aura-ring__progress"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="aura-ring__center">
        <span className="aura-ring__value">{Math.round(clamped)}%</span>
        {label && <span className="aura-ring__label text-label-sm">{label}</span>}
      </div>
    </div>
  );
}
