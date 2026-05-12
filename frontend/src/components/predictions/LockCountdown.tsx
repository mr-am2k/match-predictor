import { useEffect, useState } from 'react';

interface LockCountdownProps {
  locksAt: string;
  className?: string;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function formatCountdown(diff: number): string {
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
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
  return `${dateFormatter.format(date)} at ${timeFormatter.format(date)}`;
}

export function LockCountdown({ locksAt, className = '' }: LockCountdownProps) {
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

  if (diff <= 0) {
    return (
      <span className={`text-red-600 font-semibold ${className}`}>Locked</span>
    );
  }

  if (diff > DAY_MS) {
    return (
      <span className={`text-gray-700 ${className}`}>
        Predictions lock {formatAbsoluteLock(new Date(locksAt))}
      </span>
    );
  }

  return (
    <span className={`text-amber-700 font-medium ${className}`}>
      Locks in {formatCountdown(diff)}
    </span>
  );
}
