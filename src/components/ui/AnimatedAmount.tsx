import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../../lib/calc';

type Props = {
  value: number;
  symbol?: string;
  className?: string;
};

export default function AnimatedAmount({ value, symbol = '€', className = '' }: Props) {
  const [pulse, setPulse] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (Math.abs(value - prev.current) > 0.001) {
      prev.current = value;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 260);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span
      className={`inline-block tabular transition-transform duration-200 ${pulse ? 'scale-[1.015]' : 'scale-100'} ${className}`}
      style={{
        textShadow: pulse ? '0 0 24px rgba(57,255,176,0.55)' : '0 0 0 rgba(57,255,176,0)',
        transition: 'text-shadow 260ms ease, transform 200ms ease',
      }}
    >
      {formatCurrency(value, symbol)}
    </span>
  );
}
