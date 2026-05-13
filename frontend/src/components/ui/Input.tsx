import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, rightSlot, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-[color:var(--color-ink-300)] mb-2"
          >
            {label}
          </label>
        )}
        <div
          className={`
            group relative flex items-center
            rounded-lg border transition-colors duration-150
            ${error
              ? 'border-[color:var(--color-loss-500)]/60 bg-[color:var(--color-loss-500)]/5'
              : 'border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/70 focus-within:border-[color:var(--color-volt-200)]/70 focus-within:bg-[color:var(--color-ink-800)]'}
          `}
        >
          {icon && (
            <div className="pl-3.5 flex items-center pointer-events-none text-[color:var(--color-ink-300)] group-focus-within:text-[color:var(--color-volt-200)] transition-colors">
              <span className="[&_svg]:w-4 [&_svg]:h-4">{icon}</span>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              block w-full bg-transparent
              ${icon ? 'pl-2.5' : 'pl-4'} ${rightSlot ? 'pr-2' : 'pr-4'} py-2.5
              text-sm text-[color:var(--color-ink-50)]
              placeholder:text-[color:var(--color-ink-400)]
              disabled:opacity-50 disabled:cursor-not-allowed
              outline-none
              ${className}
            `}
            {...props}
          />
          {rightSlot && (
            <div className="pr-2 flex items-center">{rightSlot}</div>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-[color:var(--color-loss-500)] flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-[color:var(--color-loss-500)]" />
            {error}
          </p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-[color:var(--color-ink-300)]">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
