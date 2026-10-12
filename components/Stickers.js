// Original space stickers drawn in SVG (no external images needed).

export function Astronaut({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 140" aria-hidden="true">
      {/* tether */}
      <path d="M18 128 C 30 110, 10 95, 34 86" fill="none" stroke="#b9c3ff" strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
      {/* backpack */}
      <rect x="30" y="52" width="60" height="50" rx="12" fill="#c9cfe8" />
      {/* body */}
      <rect x="36" y="56" width="48" height="50" rx="16" fill="#f4f6ff" />
      <rect x="48" y="70" width="24" height="14" rx="4" fill="#9085e9" />
      <circle cx="54" cy="77" r="2.5" fill="#3fd0e6" />
      <circle cx="62" cy="77" r="2.5" fill="#f27bbd" />
      {/* arms */}
      <rect x="18" y="60" width="22" height="14" rx="7" fill="#f4f6ff" transform="rotate(-25 29 67)" />
      <rect x="80" y="54" width="22" height="14" rx="7" fill="#f4f6ff" transform="rotate(-40 91 61)" />
      <circle cx="102" cy="48" r="7" fill="#e3e7f7" />
      {/* legs */}
      <rect x="40" y="98" width="16" height="24" rx="8" fill="#f4f6ff" />
      <rect x="64" y="98" width="16" height="24" rx="8" fill="#f4f6ff" transform="rotate(12 72 110)" />
      {/* helmet */}
      <circle cx="60" cy="36" r="28" fill="#f4f6ff" />
      <rect x="40" y="22" width="40" height="28" rx="14" fill="#1b1f4b" />
      <rect x="40" y="22" width="40" height="28" rx="14" fill="url(#visor)" />
      <ellipse cx="50" cy="30" rx="6" ry="3" fill="#ffffff" opacity="0.7" transform="rotate(-20 50 30)" />
      <defs>
        <linearGradient id="visor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3987e5" stopOpacity="0.9" />
          <stop offset="1" stopColor="#9b5de5" stopOpacity="0.9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SpaceCat({ className }) {
  return (
    <svg className={className} viewBox="0 0 140 100" aria-hidden="true">
      {/* tail */}
      <path d="M22 66 C 4 60, 6 36, 20 40" fill="none" stroke="#f5a65b" strokeWidth="8" strokeLinecap="round" />
      {/* jetpack flame */}
      <path d="M30 74 L 14 86 L 32 82 Z" fill="#f5c060" />
      {/* body */}
      <ellipse cx="58" cy="66" rx="34" ry="20" fill="#f5a65b" />
      <path d="M40 56 L 46 76 M 56 50 L 58 78 M 72 54 L 70 78" stroke="#d9823a" strokeWidth="4" strokeLinecap="round" />
      {/* paws */}
      <ellipse cx="40" cy="84" rx="7" ry="5" fill="#f5a65b" />
      <ellipse cx="74" cy="84" rx="7" ry="5" fill="#f5a65b" />
      {/* head */}
      <circle cx="98" cy="46" r="22" fill="#f5a65b" />
      <path d="M80 34 L 82 14 L 94 28 Z" fill="#f5a65b" />
      <path d="M104 28 L 116 14 L 118 34 Z" fill="#f5a65b" />
      <path d="M84 30 L 85 20 L 91 27 Z" fill="#f27bbd" />
      <path d="M107 27 L 114 20 L 115 30 Z" fill="#f27bbd" />
      <circle cx="90" cy="46" r="3.5" fill="#1b1f4b" />
      <circle cx="106" cy="46" r="3.5" fill="#1b1f4b" />
      <circle cx="91" cy="45" r="1.2" fill="#fff" />
      <circle cx="107" cy="45" r="1.2" fill="#fff" />
      <path d="M95 53 Q 98 56 101 53" fill="none" stroke="#1b1f4b" strokeWidth="2" strokeLinecap="round" />
      <path d="M78 52 L 66 50 M 78 56 L 66 58 M 118 52 L 130 50 M 118 56 L 130 58" stroke="#fff" strokeWidth="1.5" opacity="0.8" />
      {/* bubble helmet */}
      <circle cx="98" cy="42" r="32" fill="#9fd8ff" fillOpacity="0.15" stroke="#cfe9ff" strokeWidth="2.5" />
      <path d="M78 24 A 26 26 0 0 1 96 14" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export function Planet({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 80" aria-hidden="true">
      <defs>
        <linearGradient id="planetFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b18cff" />
          <stop offset="1" stopColor="#3987e5" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="42" rx="56" ry="12" fill="none" stroke="#f27bbd" strokeWidth="4" opacity="0.5" />
      <circle cx="60" cy="40" r="26" fill="url(#planetFill)" />
      <path d="M38 34 Q 60 28 82 36" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 42 A 56 12 0 0 0 116 42" fill="none" stroke="#f27bbd" strokeWidth="4" />
    </svg>
  );
}
