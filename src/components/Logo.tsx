type LogoProps = {
  size?: number;
  withWordmark?: boolean;
  withTagline?: boolean;
  className?: string;
};

/**
 * The single canonical VYNRA mark: an abstract, flowing V built from two
 * asymmetric neon strokes. Reused everywhere at any size — never redrawn.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="vynra-mark-a" x1="4" y1="6" x2="24" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#39FFB0" />
          <stop offset="100%" stopColor="#12A87A" />
        </linearGradient>
        <linearGradient id="vynra-mark-b" x1="44" y1="6" x2="24" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7CFFD1" />
          <stop offset="100%" stopColor="#2FD9E8" />
        </linearGradient>
        <filter id="vynra-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="0.5" y="0.5" width="47" height="47" rx="13.5" fill="#0A0E14" stroke="rgba(255,255,255,0.06)" />
      <g filter="url(#vynra-glow)">
        <path
          d="M9 11 C13 11 15.5 13 17 17 L23.2 33.5"
          stroke="url(#vynra-mark-a)"
          strokeWidth="4.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M39 11 C33.5 11 30.5 14 28.5 19.5 L23.6 33"
          stroke="url(#vynra-mark-b)"
          strokeWidth="4.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="23.4" cy="37.4" r="2.6" fill="#39FFB0" />
      </g>
    </svg>
  );
}

export default function Logo({ size = 32, withWordmark = true, withTagline = false, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {withWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className="font-extrabold tracking-[0.14em] text-[color:var(--color-ink)]"
            style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.5 }}
          >
            VYNRA
          </span>
          {withTagline && (
            <span className="mt-1 text-[10px] font-medium tracking-[0.18em] text-[color:var(--color-neon)] uppercase">
              Turn time into more.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
