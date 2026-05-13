import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LockCountdownProps {
  locksAt: string;
  className?: string;
  /**
   * Layout variant.
   * - `inline`  (default): compact mono pill suitable for card meta rows.
   * - `block`   : large scoreboard-style HH:MM:SS readout for headline contexts.
   */
  variant?: 'inline' | 'block';
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const TEN_MIN_MS = 10 * 60 * 1000;

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function splitDiff(diff: number) {
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function formatInlineCountdown(diff: number): string {
  const { hours, minutes, seconds } = splitDiff(diff);
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  if (minutes > 0) {
    return `${pad(minutes)}:${pad(seconds)}`;
  }
  return `00:${pad(seconds)}`;
}

function formatAbsoluteLock(date: Date): string {
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`;
}

/**
 * LockCountdown
 *
 * Colour ramp (picks up DRAW yellow, then LOSS red as the window narrows):
 *   > 24h  → ink-200 (calm, absolute time)
 *   ≤ 24h  → ink-50  (active countdown)
 *   ≤ 1h   → draw-500 (warning)
 *   ≤ 10m  → loss-500 (critical)
 *   ≤ 0    → loss-500 (locked)
 */
export function LockCountdown({
  locksAt,
  className = '',
  variant = 'inline',
}: LockCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const target = new Date(locksAt).getTime();
  if (Number.isNaN(target)) {
    return null;
  }
  const diff = target - now;

  // ---- LOCKED ----
  if (diff <= 0) {
    if (variant === 'block') {
      return (
        <div
          className={`inline-flex flex-col items-center gap-1 ${className}`}
          aria-live="polite"
        >
          <span className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-loss-500)]">
            Locked
          </span>
          <span className="scoreboard text-3xl sm:text-4xl text-[color:var(--color-loss-500)]">
            00:00:00
          </span>
        </div>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-loss-500)] ${className}`}
      >
        <Lock className="w-3 h-3" strokeWidth={2.25} />
        Locked
      </span>
    );
  }

  // ---- FAR FUTURE ( > 24h ) ----
  if (diff > DAY_MS) {
    const absolute = formatAbsoluteLock(new Date(locksAt));
    if (variant === 'block') {
      const { days } = splitDiff(diff);
      return (
        <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
          <span className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)]">
            Locks in
          </span>
          <span className="scoreboard text-3xl sm:text-4xl text-[color:var(--color-ink-50)] tabular-nums">
            {days}d
          </span>
          <span className="font-mono text-[0.6rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-400)]">
            {absolute}
          </span>
        </div>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.18em] uppercase text-[color:var(--color-ink-200)] ${className}`}
      >
        <span className="w-1 h-1 rounded-full bg-[color:var(--color-ink-400)]" />
        Locks {absolute}
      </span>
    );
  }

  // ---- WITHIN 24H — active countdown ----
  const critical = diff <= TEN_MIN_MS;
  const warning = !critical && diff <= HOUR_MS;

  const colour = critical
    ? 'text-[color:var(--color-loss-500)]'
    : warning
      ? 'text-[color:var(--color-draw-500)]'
      : 'text-[color:var(--color-ink-50)]';

  const labelColour = critical
    ? 'text-[color:var(--color-loss-500)]'
    : warning
      ? 'text-[color:var(--color-draw-500)]'
      : 'text-[color:var(--color-ink-300)]';

  const digits = formatInlineCountdown(diff);

  if (variant === 'block') {
    return (
      <div
        className={`inline-flex flex-col items-center gap-1 ${className}`}
        aria-live="polite"
      >
        <span
          className={`font-mono text-[0.6rem] tracking-[0.28em] uppercase ${labelColour}`}
        >
          Locks in
        </span>
        <span
          className={`scoreboard text-3xl sm:text-4xl ${colour} ${critical ? 'animate-volt-pulse' : ''}`}
        >
          {digits}
        </span>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[0.65rem] tracking-[0.14em] uppercase tabular-nums ${colour} ${className}`}
      aria-live="polite"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          critical
            ? 'bg-[color:var(--color-loss-500)] animate-volt-pulse'
            : warning
              ? 'bg-[color:var(--color-draw-500)]'
              : 'bg-[color:var(--color-ink-400)]'
        }`}
      />
      <span className="opacity-70">T−</span>
      <span className="font-semibold">{digits}</span>
    </span>
  );
}
