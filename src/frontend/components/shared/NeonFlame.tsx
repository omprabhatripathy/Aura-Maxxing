import { useId } from 'react';
import './NeonFlame.css';

interface Props {
  size?: number;
  /** Dims the flame and stops the animation when there's no active streak. */
  lit?: boolean;
}

/** Animated neon streak flame with rising sparks. */
export default function NeonFlame({ size = 28, lit = true }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <span className={`neon-flame${lit ? '' : ' is-out'}`} style={{ width: size, height: size * 1.25 }} aria-hidden="true">
      <svg viewBox="0 0 40 50" className="neon-flame__svg">
        <defs>
          <linearGradient id={`${id}-outer`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ff2d95" />
            <stop offset="45%" stopColor="#ff6a00" />
            <stop offset="100%" stopColor="#ffd60a" />
          </linearGradient>
          <linearGradient id={`${id}-inner`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#c026d3" />
            <stop offset="60%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#fff3b0" />
          </linearGradient>
          <radialGradient id={`${id}-core`} cx="50%" cy="70%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#fff7d6" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="neon-flame__body">
          <path
            className="neon-flame__outer"
            d="M20 2C22 10 31 15 33 25C35.5 36 29 47 20 47C11 47 4.5 38 6.5 28C7.8 21.5 12 18 13 12C15.5 16 17 18 18 21C19.5 15 18 8 20 2Z"
            fill={`url(#${id}-outer)`}
          />
          <path
            className="neon-flame__inner"
            d="M20.5 15C22 21 28 25 28 32C28 39.5 24.5 44 20 44C15.5 44 12 40 12.5 34.5C13 30 16 28 17 24C18.5 27 19.5 28 20 30C21.5 25 20 20 20.5 15Z"
            fill={`url(#${id}-inner)`}
          />
          <ellipse className="neon-flame__core" cx="20" cy="37" rx="5" ry="7" fill={`url(#${id}-core)`} />
        </g>
      </svg>
      <span className="neon-flame__spark neon-flame__spark--1" />
      <span className="neon-flame__spark neon-flame__spark--2" />
      <span className="neon-flame__spark neon-flame__spark--3" />
      <span className="neon-flame__twinkle neon-flame__twinkle--1">✦</span>
      <span className="neon-flame__twinkle neon-flame__twinkle--2">✦</span>
    </span>
  );
}
