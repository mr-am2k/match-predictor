import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const base =
    'relative inline-flex items-center justify-center font-semibold tracking-wide ' +
    'transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out ' +
    'select-none whitespace-nowrap ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ' +
    'active:translate-y-px';

  const variants: Record<string, string> = {
    primary:
      'bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)] ' +
      'hover:bg-[color:var(--color-volt-100)] ' +
      'shadow-[0_0_0_1px_rgba(215,255,61,0.35),0_8px_32px_-12px_rgba(215,255,61,0.6)] ' +
      'hover:shadow-[0_0_0_1px_rgba(215,255,61,0.5),0_12px_40px_-8px_rgba(215,255,61,0.75)]',
    secondary:
      'bg-[color:var(--color-ink-750)] text-[color:var(--color-ink-50)] ' +
      'border border-[color:var(--color-ink-600)] ' +
      'hover:bg-[color:var(--color-ink-700)] hover:border-[color:var(--color-ink-500)]',
    outline:
      'bg-transparent text-[color:var(--color-ink-100)] ' +
      'border border-[color:var(--color-ink-600)] ' +
      'hover:bg-[color:var(--color-ink-800)] hover:text-[color:var(--color-volt-200)] ' +
      'hover:border-[color:var(--color-volt-200)]/50',
    ghost:
      'bg-transparent text-[color:var(--color-ink-200)] ' +
      'hover:bg-[color:var(--color-ink-800)] hover:text-[color:var(--color-ink-50)]',
    danger:
      'bg-[color:var(--color-loss-600)] text-white ' +
      'hover:bg-[color:var(--color-loss-500)] ' +
      'shadow-[0_0_0_1px_rgba(255,92,92,0.3),0_8px_24px_-8px_rgba(255,92,92,0.5)]',
  };

  const sizes: Record<string, string> = {
    sm: 'h-8 px-3 text-[0.75rem] gap-1.5 rounded-md',
    md: 'h-10 px-4 text-sm gap-2 rounded-lg',
    lg: 'h-12 px-6 text-[0.95rem] gap-2.5 rounded-lg',
  };

  const iconEl = isLoading ? (
    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
  ) : icon ? (
    <span className="shrink-0 inline-flex items-center justify-center [&_svg]:w-4 [&_svg]:h-4">
      {icon}
    </span>
  ) : null;

  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {iconPosition === 'left' && iconEl}
      <span className="inline-flex items-center">{children}</span>
      {iconPosition === 'right' && iconEl}
    </button>
  );
}
