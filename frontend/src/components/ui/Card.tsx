import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  variant?: 'default' | 'raised' | 'outline' | 'volt';
}

export function Card({ children, className = '', hover = false, variant = 'default' }: CardProps) {
  const variants: Record<string, string> = {
    default:
      'bg-[color:var(--color-ink-850)]/85 backdrop-blur-[6px] border border-[color:var(--color-ink-700)]',
    raised:
      'bg-[color:var(--color-ink-800)]/90 border border-[color:var(--color-ink-700)] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]',
    outline: 'bg-transparent border border-[color:var(--color-ink-700)]',
    volt:
      'bg-[color:var(--color-ink-850)] border border-[color:var(--color-volt-200)]/40 ' +
      'shadow-[0_0_0_1px_rgba(215,255,61,0.15),0_20px_60px_-30px_rgba(215,255,61,0.3)]',
  };

  return (
    <div
      className={`
        relative rounded-xl overflow-hidden
        ${variants[variant]}
        ${hover
          ? 'transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:border-[color:var(--color-ink-500)] hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(215,255,61,0.08)]'
          : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: SectionProps) {
  return (
    <div
      className={`px-5 sm:px-6 py-4 border-b border-[color:var(--color-ink-700)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }: SectionProps) {
  return <div className={`px-5 sm:px-6 py-5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: SectionProps) {
  return (
    <div
      className={`px-5 sm:px-6 py-4 border-t border-[color:var(--color-ink-700)] ${className}`}
    >
      {children}
    </div>
  );
}

interface CardEyebrowProps {
  children: ReactNode;
  className?: string;
}

export function CardEyebrow({ children, className = '' }: CardEyebrowProps) {
  return (
    <p
      className={`text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-[color:var(--color-ink-300)] ${className}`}
    >
      {children}
    </p>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
}

export function CardTitle({ children, className = '', as: Tag = 'h3' }: CardTitleProps) {
  return (
    <Tag
      className={`font-display text-2xl sm:text-3xl text-[color:var(--color-ink-50)] leading-none tracking-wide uppercase ${className}`}
    >
      {children}
    </Tag>
  );
}
