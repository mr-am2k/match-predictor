import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Optional secondary text shown muted next to the label (e.g. a player position). */
  hint?: string | null;
}

interface SearchableSelectProps {
  value: string | number | null;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onClear?: () => void;
  canClear?: boolean;
}

interface PanelRect {
  left: number;
  top: number;
  width: number;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches',
  onClear,
  canClear = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<PanelRect | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(
    () => options.find((opt) => opt.value === String(value)) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  const updateRect = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.bottom + 6, width: r.width });
  }, []);

  // Keep the portal-rendered panel aligned with the trigger.
  useLayoutEffect(() => {
    if (!open) return;
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open, updateRect]);

  // Focus the search box when the menu opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Highlighted option, clamped to the current filtered list (derived, not stored).
  const safeActive = filtered.length === 0 ? 0 : Math.min(activeIndex, filtered.length - 1);

  // Close on click outside the trigger or panel.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Scroll the active option into view as it changes.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[safeActive] as HTMLElement | undefined;
    node?.scrollIntoView({ block: 'nearest' });
  }, [safeActive, open]);

  const openMenu = useCallback(() => {
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const commit = useCallback(
    (val: string) => {
      onChange(val);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange]
  );

  const onTriggerKeyDown = (e: ReactKeyboardEvent) => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openMenu();
    }
  };

  const onSearchKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(Math.min(safeActive + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(Math.max(safeActive - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[safeActive];
      if (opt) commit(opt.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)] focus:border-[color:var(--color-volt-200)]/70 disabled:opacity-50 disabled:cursor-not-allowed px-3.5 py-2.5 text-sm text-left outline-none transition-colors"
      >
        <span
          className={
            selected
              ? 'truncate text-[color:var(--color-ink-50)]'
              : 'truncate text-[color:var(--color-ink-400)]'
          }
        >
          {selected ? selected.label : placeholder}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`shrink-0 w-4 h-4 text-[color:var(--color-ink-300)] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width, zIndex: 60 }}
            className="rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)] shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="p-2 border-b border-[color:var(--color-ink-700)]">
              <div className="relative">
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-ink-400)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="9" cy="9" r="6" />
                  <path d="M14 14l4 4" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onSearchKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-md border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)] focus:border-[color:var(--color-volt-200)]/70 pl-8 pr-3 py-2 text-sm text-[color:var(--color-ink-50)] placeholder:text-[color:var(--color-ink-400)] outline-none"
                />
              </div>
            </div>

            <ul ref={listRef} role="listbox" className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3.5 py-3 text-sm text-[color:var(--color-ink-400)]">{emptyMessage}</li>
              ) : (
                filtered.map((opt, idx) => {
                  const isSelected = opt.value === String(value);
                  const isActive = idx === safeActive;
                  return (
                    <li key={opt.value} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => commit(opt.value)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 text-sm text-left transition-colors ${
                          isActive ? 'bg-[color:var(--color-ink-800)]' : ''
                        } ${isSelected ? 'text-[color:var(--color-volt-200)]' : 'text-[color:var(--color-ink-100)]'}`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {opt.hint && (
                          <span className="shrink-0 font-mono text-[0.6rem] tracking-[0.18em] uppercase text-[color:var(--color-ink-400)]">
                            {opt.hint}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )}

      {canClear && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-300)] hover:text-[color:var(--color-loss-500)] transition-colors"
        >
          ✕ Clear selection
        </button>
      )}
    </div>
  );
}
