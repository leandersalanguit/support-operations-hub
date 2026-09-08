/**
 * @file ClassificationSelector.tsx
 * @description Reusable case classification selector component with support category taxonomy.
 * Implemented as an accessible custom dropdown listbox with full keyboard navigation
 * to prevent screen scrolling when holding or pressing the Down arrow.
 */

import React, { useState, useMemo, useRef } from 'react';
import { Layers, ChevronDown, Check } from 'lucide-react';
import { useListKeyboardNavigation } from './useListKeyboardNavigation';
import { useClickOutside } from './useClickOutside';

export interface ClassificationSelectorProps {
  value: string;
  onChange: (val: string) => void;
  classifications: string[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export const ClassificationSelector: React.FC<ClassificationSelectorProps> = React.memo(({
  value,
  onChange,
  classifications,
  error,
  required = true,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const initialIndex = useMemo(() => {
    const idx = classifications.indexOf(value);
    return idx >= 0 ? idx : 0;
  }, [classifications, value]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const {
    activeIndex,
    setActiveIndex,
    itemRefs,
    handleKeyDown: handleListKeyDown,
  } = useListKeyboardNavigation<HTMLButtonElement>({
    itemCount: classifications.length,
    isOpen,
    onSelect: (idx) => {
      const selected = classifications[idx];
      if (selected) {
        handleSelect(selected);
      }
    },
    onClose: () => setIsOpen(false),
    triggerRef,
    initialIndex,
  });

  // Close dropdown on outside click
  useClickOutside(containerRef, () => setIsOpen(false), { enabled: isOpen });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Enter' && !disabled && !value) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    handleListKeyDown(e);
  };

  return (
    <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
          <span>Case Classification</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      </div>

      {/* Accessible Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full px-3.5 py-2.5 text-sm font-medium bg-white dark:bg-slate-800 border rounded-xl shadow-2xs focus:outline-none cursor-pointer flex items-center justify-between text-left transition-colors ${
          !value ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100 font-semibold'
        } ${
          error
            ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
            : isOpen
            ? 'border-fotoblue-500 ring-2 ring-fotoblue-500/20 dark:ring-fotoblue-400/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {value || '-- Select Case Classification --'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-fotoblue-600 dark:text-fotoblue-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Case Classifications"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn overscroll-contain"
        >
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 overscroll-contain">
            {classifications.map((classification, idx) => {
              const isSelected = value === classification;
              const isActive = activeIndex === idx;
              return (
                <button
                  key={classification}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  type="button"
                  onClick={() => handleSelect(classification)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    isSelected
                      ? 'bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-900 dark:text-fotoblue-200 font-bold ring-1 ring-inset ring-fotoblue-500/50'
                      : isActive
                      ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 font-semibold ring-1 ring-inset ring-slate-300 dark:ring-slate-600'
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-medium'
                  }`}
                >
                  <span className="truncate">{classification}</span>
                  {isSelected && <Check className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
          {error}
        </p>
      )}
    </div>
  );
});
