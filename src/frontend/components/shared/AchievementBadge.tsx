import { useId } from 'react';
import type { ReactNode } from 'react';
import { BADGE_GLOW, stickerFor } from '../../lib/achievementStickers';

type Mode = 'dark' | 'light';
type Art = (mode: Mode, g: (name: string) => string) => ReactNode;

/* Badge artwork: one 120×120 sticker per achievement, with dark (gradient glow) and light (flat daylight) variants. */
const ART: Record<string, Art> = {
  'first-habit': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#064e3b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#022c22" />
          </radialGradient>
          <linearGradient id={g('ring')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <radialGradient id={g('glow')} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke={`url(#${g('ring')})`} strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#6ee7b7" strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="3 3" />
        <ellipse cx="60" cy="84" rx="28" ry="9" fill="#1e293b" />
        <ellipse cx="60" cy="83" rx="22" ry="6" fill="#334155" />
        <circle cx="60" cy="55" r="22" fill={`url(#${g('glow')})`} />
        <path d="M60 82C60 70 58 60 60 52" stroke="#34d399" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M60 62C50 62 42 54 44 44C54 44 60 54 60 62Z" fill="#10b981" stroke="#a7f3d0" strokeWidth="1.5" />
        <path d="M60 54C70 54 78 46 76 36C66 36 60 46 60 54Z" fill="#34d399" stroke="#ecfdf5" strokeWidth="1.5" />
        <circle cx="60" cy="46" r="3.5" fill="#fef08a" />
        <circle cx="40" cy="38" r="1.5" fill="#a7f3d0" />
        <circle cx="78" cy="62" r="1.8" fill="#6ee7b7" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#ecfdf5" stroke="#10b981" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#34d399" strokeWidth="1.2" strokeDasharray="3 3" />
        <ellipse cx="60" cy="83" rx="26" ry="8" fill="#d1fae5" />
        <ellipse cx="60" cy="82" rx="20" ry="5" fill="#a7f3d0" />
        <circle cx="60" cy="55" r="20" fill="#a7f3d0" fillOpacity="0.5" />
        <path d="M60 82C60 70 58 60 60 52" stroke="#059669" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M60 62C50 62 42 54 44 44C54 44 60 54 60 62Z" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
        <path d="M60 54C70 54 78 46 76 36C66 36 60 46 60 54Z" fill="#34d399" stroke="#059669" strokeWidth="1.5" />
        <circle cx="60" cy="46" r="3.5" fill="#eab308" />
      </>
    ),

  'first-completion': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#0f172a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#030712" />
          </radialGradient>
          <linearGradient id={g('ring')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke={`url(#${g('ring')})`} strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#67e8f9" strokeWidth="1" strokeOpacity="0.4" />
        <path d="M28 55H46M24 64H50M32 73H44" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <path d="M42 61L54 73L84 41" stroke="#0891b2" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M42 59L54 71L84 39" stroke={`url(#${g('ring')})`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M42 57L54 69L84 37" stroke="#e0f2fe" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="86" cy="37" r="3.5" fill="#67e8f9" />
        <circle cx="54" cy="71" r="2.5" fill="#38bdf8" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#ecfeff" stroke="#06b6d4" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#22d3ee" strokeWidth="1" />
        <path d="M28 55H46M24 64H50M32 73H44" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <path d="M42 61L54 73L84 41" stroke="#0891b2" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M42 59L54 71L84 39" stroke="#22d3ee" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M42 57L54 69L84 37" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="86" cy="37" r="3" fill="#0891b2" />
      </>
    ),

  'streak-7': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#9333ea" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#2e1065" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0f0728" />
          </radialGradient>
          <linearGradient id={g('flame')} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7e22ce" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f5d0fe" />
          </linearGradient>
          <radialGradient id={g('inner')} cx="50%" cy="60%" r="40%">
            <stop offset="0%" stopColor="#fbcfe8" />
            <stop offset="80%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke="#a855f7" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#d8b4fe" strokeWidth="1.2" strokeDasharray="4 2" />
        <path d="M60 28C60 28 76 44 76 64C76 74 69 82 60 84C51 82 44 74 44 64C44 48 56 36 60 28Z" fill="#581c87" />
        <path d="M60 34C60 34 73 48 73 65C73 73 67 80 60 82C53 80 47 73 47 65C47 50 57 40 60 34Z" fill={`url(#${g('flame')})`} />
        <path d="M60 52C60 52 67 60 67 70C67 75 64 79 60 80C56 79 53 75 53 70C53 62 58 56 60 52Z" fill={`url(#${g('inner')})`} />
        <circle cx="44" cy="40" r="2" fill="#e879f9" />
        <circle cx="75" cy="45" r="2.2" fill="#c084fc" />
        <circle cx="60" cy="24" r="1.5" fill="#fdf4ff" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#faf5ff" stroke="#9333ea" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#c084fc" strokeWidth="1.2" strokeDasharray="4 2" />
        <path d="M60 28C60 28 76 44 76 64C76 74 69 82 60 84C51 82 44 74 44 64C44 48 56 36 60 28Z" fill="#a855f7" />
        <path d="M60 34C60 34 73 48 73 65C73 73 67 80 60 82C53 80 47 73 47 65C47 50 57 40 60 34Z" fill="#c084fc" />
        <path d="M60 52C60 52 67 60 67 70C67 75 64 79 60 80C56 79 53 75 53 70C53 62 58 56 60 52Z" fill="#fdf4ff" />
        <circle cx="44" cy="40" r="2" fill="#9333ea" />
        <circle cx="75" cy="45" r="2.2" fill="#a855f7" />
      </>
    ),

  'streak-30': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#b45309" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#451a03" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1c0a00" />
          </radialGradient>
          <linearGradient id={g('gold')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke={`url(#${g('gold')})`} strokeWidth="4.5" />
        <circle cx="60" cy="60" r="46" stroke="#fef08a" strokeWidth="1.2" strokeOpacity="0.6" />
        <path d="M26 84C42 74 62 58 72 40" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" opacity="0.4" />
        <path d="M36 88C50 78 68 62 76 44" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
        <rect x="36" y="38" width="48" height="42" rx="8" fill="#1e1b4b" stroke={`url(#${g('gold')})`} strokeWidth="2.5" />
        <rect x="36" y="38" width="48" height="12" rx="6" fill="#b45309" />
        <circle cx="48" cy="44" r="2" fill="#fef08a" />
        <circle cx="72" cy="44" r="2" fill="#fef08a" />
        <path d="M60 54L63 62L71 63L65 68L67 76L60 71L53 76L55 68L49 63L57 62L60 54Z" fill="#fbbf24" stroke="#fff" strokeWidth="1" />
        <circle cx="34" cy="34" r="2" fill="#fde047" />
        <circle cx="86" cy="80" r="2.5" fill="#f59e0b" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#fffbeb" stroke="#f59e0b" strokeWidth="4.5" />
        <circle cx="60" cy="60" r="46" stroke="#fbbf24" strokeWidth="1.2" />
        <path d="M26 84C42 74 62 58 72 40" stroke="#fde68a" strokeWidth="8" strokeLinecap="round" />
        <path d="M36 88C50 78 68 62 76 44" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
        <rect x="36" y="38" width="48" height="42" rx="8" fill="#ffffff" stroke="#f59e0b" strokeWidth="2.5" />
        <rect x="36" y="38" width="48" height="12" rx="6" fill="#f59e0b" />
        <circle cx="48" cy="44" r="2" fill="#fff" />
        <circle cx="72" cy="44" r="2" fill="#fff" />
        <path d="M60 54L63 62L71 63L65 68L67 76L60 71L53 76L55 68L49 63L57 62L60 54Z" fill="#f59e0b" />
      </>
    ),

  'completions-100': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#eab308" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#3b0764" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#18022a" />
          </radialGradient>
          <linearGradient id={g('gold')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="35%" stopColor="#facc15" />
            <stop offset="70%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke={`url(#${g('gold')})`} strokeWidth="4.5" />
        <circle cx="60" cy="60" r="47" stroke="#fef08a" strokeWidth="1" strokeOpacity="0.5" />
        <path d="M42 42C38 48 38 58 42 66C45 72 50 78 57 82" stroke={`url(#${g('gold')})`} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="40" cy="48" rx="4" ry="2.2" transform="rotate(-30 40 48)" fill="#facc15" />
        <ellipse cx="38" cy="58" rx="4.5" ry="2.2" transform="rotate(-10 38 58)" fill="#eab308" />
        <ellipse cx="42" cy="68" rx="4" ry="2.2" transform="rotate(25 42 68)" fill="#ca8a04" />
        <path d="M78 42C82 48 82 58 78 66C75 72 70 78 63 82" stroke={`url(#${g('gold')})`} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="80" cy="48" rx="4" ry="2.2" transform="rotate(30 80 48)" fill="#facc15" />
        <ellipse cx="82" cy="58" rx="4.5" ry="2.2" transform="rotate(10 82 58)" fill="#eab308" />
        <ellipse cx="78" cy="68" rx="4" ry="2.2" transform="rotate(-25 78 68)" fill="#ca8a04" />
        <path d="M50 64L60 48L70 64H50Z" fill={`url(#${g('gold')})`} />
        <circle cx="60" cy="58" r="3.5" fill="#f8fafc" stroke="#ca8a04" strokeWidth="1" />
        <circle cx="60" cy="38" r="2.5" fill="#fde047" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#fefce8" stroke="#ca8a04" strokeWidth="4.5" />
        <circle cx="60" cy="60" r="47" stroke="#facc15" strokeWidth="1" />
        <path d="M42 42C38 48 38 58 42 66C45 72 50 78 57 82" stroke="#ca8a04" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="40" cy="48" rx="4" ry="2.2" transform="rotate(-30 40 48)" fill="#eab308" />
        <ellipse cx="38" cy="58" rx="4.5" ry="2.2" transform="rotate(-10 38 58)" fill="#ca8a04" />
        <ellipse cx="42" cy="68" rx="4" ry="2.2" transform="rotate(25 42 68)" fill="#a16207" />
        <path d="M78 42C82 48 82 58 78 66C75 72 70 78 63 82" stroke="#ca8a04" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="80" cy="48" rx="4" ry="2.2" transform="rotate(30 80 48)" fill="#eab308" />
        <ellipse cx="82" cy="58" rx="4.5" ry="2.2" transform="rotate(10 82 58)" fill="#ca8a04" />
        <ellipse cx="78" cy="68" rx="4" ry="2.2" transform="rotate(-25 78 68)" fill="#a16207" />
        <path d="M50 64L60 48L70 64H50Z" fill="#eab308" />
        <circle cx="60" cy="58" r="3.5" fill="#ffffff" stroke="#ca8a04" strokeWidth="1" />
      </>
    ),

  'first-goal': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#0c2340" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#030b14" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke="#0ea5e9" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />
        <circle cx="60" cy="60" r="26" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="60" cy="60" r="14" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="60" cy="60" r="5" fill="#38bdf8" />
        <line x1="28" y1="60" x2="92" y2="60" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="4 2" />
        <line x1="60" y1="28" x2="60" y2="92" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d="M78 36L64 56L61 53L75 33L78 36Z" fill="#e0f2fe" />
        <path d="M64 56L59 61L60 56L64 56Z" fill="#0284c7" />
        <path d="M75 33L84 28L80 37L75 33Z" fill="#38bdf8" />
        <circle cx="85" cy="27" r="2" fill="#7dd3fc" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#f0fdf4" stroke="#0284c7" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#38bdf8" strokeWidth="1" />
        <circle cx="60" cy="60" r="26" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="60" cy="60" r="14" stroke="#0ea5e9" strokeWidth="2" />
        <circle cx="60" cy="60" r="5" fill="#0284c7" />
        <line x1="28" y1="60" x2="92" y2="60" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="4 2" />
        <line x1="60" y1="28" x2="60" y2="92" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d="M78 36L64 56L61 53L75 33L78 36Z" fill="#0369a1" />
        <path d="M75 33L84 28L80 37L75 33Z" fill="#38bdf8" />
      </>
    ),

  'goal-complete': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#064e3b" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#022c22" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke="#10b981" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#6ee7b7" strokeWidth="1.2" strokeOpacity="0.5" />
        <circle cx="60" cy="60" r="30" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.4" />
        <circle cx="60" cy="60" r="20" stroke="#6ee7b7" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="9" fill="#f59e0b" stroke="#fef08a" strokeWidth="2" />
        <path d="M60 32V38M60 82V88M32 60H38M82 60H88M40 40L44 44M76 76L80 80M40 80L44 76M76 44L80 40" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="60" cy="60" r="4" fill="#ffffff" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#ecfdf5" stroke="#10b981" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#34d399" strokeWidth="1.2" />
        <circle cx="60" cy="60" r="30" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.4" />
        <circle cx="60" cy="60" r="20" stroke="#059669" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="9" fill="#f59e0b" stroke="#fef08a" strokeWidth="2" />
        <path d="M60 32V38M60 82V88M32 60H38M82 60H88M40 40L44 44M76 76L80 80M40 80L44 76M76 44L80 40" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="60" cy="60" r="4" fill="#ffffff" />
      </>
    ),

  'goals-5': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#451a03" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1e0b02" />
          </radialGradient>
          <linearGradient id={g('gold')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="40%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke={`url(#${g('gold')})`} strokeWidth="4.5" />
        <circle cx="60" cy="60" r="47" stroke="#fde68a" strokeWidth="1.2" strokeOpacity="0.6" />
        <path d="M44 42H76V56C76 65 69 71 60 71C51 71 44 65 44 56V42Z" fill={`url(#${g('gold')})`} stroke="#fef3c7" strokeWidth="1.5" />
        <path d="M44 46C38 46 34 50 34 56C34 62 39 65 44 65" stroke={`url(#${g('gold')})`} strokeWidth="3" strokeLinecap="round" />
        <path d="M76 46C82 46 86 50 86 56C86 62 81 65 76 65" stroke={`url(#${g('gold')})`} strokeWidth="3" strokeLinecap="round" />
        <path d="M58 71H62V79H58V71Z" fill="#d97706" />
        <rect x="50" y="79" width="20" height="6" rx="2" fill={`url(#${g('gold')})`} />
        <circle cx="60" cy="54" r="3" fill="#ffffff" />
        <ellipse cx="60" cy="58" rx="34" ry="12" stroke="#fde047" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
        <circle cx="30" cy="38" r="2" fill="#fff" />
        <circle cx="88" cy="42" r="2.2" fill="#fde68a" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#fffbeb" stroke="#f59e0b" strokeWidth="4.5" />
        <circle cx="60" cy="60" r="47" stroke="#fbbf24" strokeWidth="1.2" />
        <path d="M44 42H76V56C76 65 69 71 60 71C51 71 44 65 44 56V42Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
        <path d="M44 46C38 46 34 50 34 56C34 62 39 65 44 65" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
        <path d="M76 46C82 46 86 50 86 56C86 62 81 65 76 65" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
        <path d="M58 71H62V79H58V71Z" fill="#d97706" />
        <rect x="50" y="79" width="20" height="6" rx="2" fill="#f59e0b" />
        <circle cx="60" cy="54" r="3" fill="#ffffff" />
        <ellipse cx="60" cy="58" rx="34" ry="12" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      </>
    ),

  'first-entry': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#1e1b4b" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0b0a1a" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke="#a855f7" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#c084fc" strokeWidth="1.2" strokeOpacity="0.5" />
        <rect x="42" y="38" width="36" height="46" rx="4" fill="#312e81" stroke="#818cf8" strokeWidth="2" />
        <path d="M42 38V84" stroke="#c084fc" strokeWidth="4" strokeLinecap="round" />
        <path d="M56 38V54L60 50L64 54V38" fill="#ec4899" />
        <circle cx="60" cy="64" r="5" fill="#a855f7" stroke="#e9d5ff" strokeWidth="1.5" />
        <path d="M72 44C78 40 84 46 80 52" stroke="#67e8f9" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="34" cy="48" r="1.8" fill="#e9d5ff" />
        <circle cx="82" cy="68" r="2" fill="#818cf8" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#faf5ff" stroke="#a855f7" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#c084fc" strokeWidth="1.2" />
        <rect x="42" y="38" width="36" height="46" rx="4" fill="#f3e8ff" stroke="#9333ea" strokeWidth="2" />
        <path d="M42 38V84" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" />
        <path d="M56 38V54L60 50L64 54V38" fill="#ec4899" />
        <circle cx="60" cy="64" r="5" fill="#9333ea" stroke="#f3e8ff" strokeWidth="1.5" />
        <path d="M72 44C78 40 84 46 80 52" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),

  'entries-10': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#164e63" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#082f49" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke="#06b6d4" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#67e8f9" strokeWidth="1.2" strokeOpacity="0.5" />
        <polygon points="60,30 84,45 84,75 60,90 36,75 36,45" fill="#0e7490" stroke="#22d3ee" strokeWidth="3" />
        <polygon points="60,38 76,49 76,71 60,82 44,71 44,49" fill="#155e75" stroke="#a5f3fc" strokeWidth="1.5" />
        <line x1="44" y1="49" x2="76" y2="71" stroke="#e0f2fe" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="60" cy="60" r="6" fill="#cffafe" stroke="#0891b2" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="2" fill="#ffffff" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#f0fdfa" stroke="#06b6d4" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#22d3ee" strokeWidth="1.2" />
        <polygon points="60,30 84,45 84,75 60,90 36,75 36,45" fill="#cffafe" stroke="#0891b2" strokeWidth="3" />
        <polygon points="60,38 76,49 76,71 60,82 44,71 44,49" fill="#e0f2fe" stroke="#06b6d4" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="6" fill="#0891b2" stroke="#ffffff" strokeWidth="1.5" />
      </>
    ),

  // The source designs only show this one locked; the unlocked colours extend its pink journal palette.
  'words-5000': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#4a044e" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1a021c" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke="#ec4899" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#f9a8d4" strokeWidth="1.2" strokeOpacity="0.5" />
        <path d="M60 70C52 64 42 64 36 66V46C42 44 52 44 60 50C68 44 78 44 84 46V66C78 64 68 64 60 70Z" fill="#831843" stroke="#f9a8d4" strokeWidth="2" />
        <line x1="60" y1="50" x2="60" y2="70" stroke="#f472b6" strokeWidth="2" />
        <path d="M42 52H54M42 57H54M66 52H78M66 57H78" stroke="#fbcfe8" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <path d="M72 30L64 46" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M72 30C78 32 80 38 76 42L66 44" fill="#f472b6" stroke="#fbcfe8" strokeWidth="1" />
        <circle cx="38" cy="36" r="1.8" fill="#fbcfe8" />
        <circle cx="84" cy="76" r="2" fill="#f472b6" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#fdf2f8" stroke="#db2777" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#f9a8d4" strokeWidth="1.2" />
        <path d="M60 70C52 64 42 64 36 66V46C42 44 52 44 60 50C68 44 78 44 84 46V66C78 64 68 64 60 70Z" fill="#fce7f3" stroke="#be185d" strokeWidth="2" />
        <line x1="60" y1="50" x2="60" y2="70" stroke="#db2777" strokeWidth="2" />
        <path d="M42 52H54M42 57H54M66 52H78M66 57H78" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M72 30L64 46" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M72 30C78 32 80 38 76 42L66 44" fill="#f472b6" stroke="#be185d" strokeWidth="1" />
      </>
    ),

  'mood-7': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#134e4a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#042f2e" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke="#2dd4bf" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#5eead4" strokeWidth="1" strokeOpacity="0.5" />
        <ellipse cx="60" cy="60" rx="36" ry="14" stroke="#5eead4" strokeWidth="1.2" strokeDasharray="3 3" />
        <path d="M34 60C34 60 46 44 60 44C74 44 86 60 86 60C86 60 74 76 60 76C46 76 34 60 34 60Z" stroke="#5eead4" strokeWidth="2.5" fill="#0f3d3a" />
        <circle cx="60" cy="60" r="9" fill="#2dd4bf" stroke="#99f6e4" strokeWidth="2" />
        <circle cx="60" cy="60" r="3.5" fill="#042f2e" />
        <circle cx="63" cy="57" r="1.5" fill="#ffffff" />
        <circle cx="30" cy="40" r="1.8" fill="#99f6e4" />
        <circle cx="88" cy="78" r="2" fill="#2dd4bf" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#f0fdfa" stroke="#0d9488" strokeWidth="4" />
        <circle cx="60" cy="60" r="46" stroke="#5eead4" strokeWidth="1" />
        <ellipse cx="60" cy="60" rx="36" ry="14" stroke="#14b8a6" strokeWidth="1.2" strokeDasharray="3 3" />
        <path d="M34 60C34 60 46 44 60 44C74 44 86 60 86 60C86 60 74 76 60 76C46 76 34 60 34 60Z" stroke="#0f766e" strokeWidth="2.5" fill="#ccfbf1" />
        <circle cx="60" cy="60" r="9" fill="#14b8a6" stroke="#0f766e" strokeWidth="2" />
        <circle cx="60" cy="60" r="3.5" fill="#134e4a" />
        <circle cx="63" cy="57" r="1.5" fill="#ffffff" />
      </>
    ),

  balanced: (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#3b0764" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#18022a" />
          </radialGradient>
          <linearGradient id={g('gold')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="45%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#c026d3" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke={`url(#${g('gold')})`} strokeWidth="4.5" />
        <circle cx="60" cy="60" r="46" stroke="#f0abfc" strokeWidth="1" strokeOpacity="0.5" />
        <circle cx="60" cy="60" r="26" fill="#1e1b4b" stroke="#fbbf24" strokeWidth="2" />
        <path d="M60 34C74.3 34 86 45.6 86 60C86 74.3 74.3 86 60 86C60 73 50 73 50 60C50 47 60 47 60 34Z" fill={`url(#${g('gold')})`} />
        <circle cx="60" cy="47" r="4" fill="#fbbf24" />
        <circle cx="60" cy="73" r="4" fill="#1e1b4b" />
        <circle cx="34" cy="34" r="2" fill="#fde047" />
        <circle cx="86" cy="84" r="2" fill="#e879f9" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#fefce8" stroke="#ca8a04" strokeWidth="4.5" />
        <circle cx="60" cy="60" r="46" stroke="#facc15" strokeWidth="1" />
        <circle cx="60" cy="60" r="26" fill="#ffffff" stroke="#ca8a04" strokeWidth="2" />
        <path d="M60 34C74.3 34 86 45.6 86 60C86 74.3 74.3 86 60 86C60 73 50 73 50 60C50 47 60 47 60 34Z" fill="#fbbf24" />
        <circle cx="60" cy="47" r="4" fill="#fbbf24" />
        <circle cx="60" cy="73" r="4" fill="#ffffff" />
      </>
    ),

  'aura-farmer': (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#451a03" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1c0a02" />
          </radialGradient>
          <linearGradient id={g('gold')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke={`url(#${g('gold')})`} strokeWidth="4.5" />
        <circle cx="60" cy="60" r="46" stroke="#fcd34d" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="2 4" />
        <path d="M60 88V44" stroke={`url(#${g('gold')})`} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M60 44c-6-4-6-12 0-16 6 4 6 12 0 16Z" fill={`url(#${g('gold')})`} />
        <path d="M60 58c-9 0-14-6-14-13 8 0 14 5 14 13Z" fill="#fbbf24" />
        <path d="M60 58c9 0 14-6 14-13-8 0-14 5-14 13Z" fill="#f59e0b" />
        <path d="M60 72c-9 0-14-6-14-13 8 0 14 5 14 13Z" fill="#fcd34d" />
        <path d="M60 72c9 0 14-6 14-13-8 0-14 5-14 13Z" fill="#fbbf24" />
        <rect x="40" y="82" width="40" height="14" rx="7" fill="#1c0a02" stroke="#fbbf24" strokeWidth="1.5" />
        <text x="60" y="92.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fde68a" fontFamily="system-ui, sans-serif">
          1K PTS
        </text>
        <path d="M30 36l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="#fde047" />
        <path d="M88 30l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5Z" fill="#fcd34d" />
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#fffbeb" stroke="#d97706" strokeWidth="4.5" />
        <circle cx="60" cy="60" r="46" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 4" />
        <path d="M60 88V44" stroke="#b45309" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M60 44c-6-4-6-12 0-16 6 4 6 12 0 16Z" fill="#f59e0b" />
        <path d="M60 58c-9 0-14-6-14-13 8 0 14 5 14 13Z" fill="#fbbf24" />
        <path d="M60 58c9 0 14-6 14-13-8 0-14 5-14 13Z" fill="#f59e0b" />
        <path d="M60 72c-9 0-14-6-14-13 8 0 14 5 14 13Z" fill="#fcd34d" />
        <path d="M60 72c9 0 14-6 14-13-8 0-14 5-14 13Z" fill="#fbbf24" />
        <rect x="40" y="82" width="40" height="14" rx="7" fill="#ffffff" stroke="#d97706" strokeWidth="1.5" />
        <text x="60" y="92.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#b45309" fontFamily="system-ui, sans-serif">
          1K PTS
        </text>
      </>
    ),
};

interface Props {
  id: string;
  mode: Mode;
  className?: string;
  label: string;
}

/** Medal built from the achievement's sticker emoji and colour, for badges without bespoke art. */
function medalArt(id: string): Art {
  const { emoji } = stickerFor(id);
  const color = BADGE_GLOW[id] ?? stickerFor(id).color;
  return (m, g) =>
    m === 'dark' ? (
      <>
        <defs>
          <radialGradient id={g('bg')} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="75%" stopColor="#0f0d18" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#05040a" />
          </radialGradient>
          <linearGradient id={g('ring')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="50%" stopColor={color} />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${g('bg')})`} stroke={`url(#${g('ring')})`} strokeWidth="4.5" />
        <circle cx="60" cy="60" r="45" stroke={color} strokeWidth="1.2" strokeOpacity="0.55" strokeDasharray="2 4" />
        <circle cx="60" cy="60" r="30" fill={color} fillOpacity="0.18" />
        <text x="60" y="72" textAnchor="middle" fontSize="34">
          {emoji}
        </text>
      </>
    ) : (
      <>
        <circle cx="60" cy="60" r="54" fill="#ffffff" stroke={color} strokeWidth="4.5" />
        <circle cx="60" cy="60" r="45" stroke={color} strokeWidth="1.2" strokeDasharray="2 4" />
        <circle cx="60" cy="60" r="30" fill={color} fillOpacity="0.15" />
        <text x="60" y="72" textAnchor="middle" fontSize="34">
          {emoji}
        </text>
      </>
    );
}

export default function AchievementBadge({ id, mode, className, label }: Props) {
  // useId output contains characters that break url(#…) references.
  const prefix = `b${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const art = ART[id] ?? medalArt(id);
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label={label}>
      {art(mode, (name) => `${prefix}-${name}`)}
    </svg>
  );
}
