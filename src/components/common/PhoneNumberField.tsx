/**
 * @file PhoneNumberField.tsx
 * @description Reusable phone input component supporting saved client number dropdown,
 * US/UK international phone auto-formatting (+1 / +44), and new phone entry toggle.
 * Implemented as an accessible custom dropdown listbox when multiple numbers exist.
 */

import React, { useState, useMemo, useRef } from 'react';
import { Phone, Info, ChevronDown, Check, PlusCircle } from 'lucide-react';
import { ClientProfile } from '../../domain/client/types';
import { formatPhoneNumber, sanitizePhoneInput, didAppendUSCountryCode } from '../../domain/client/phone';
import { useListKeyboardNavigation } from './useListKeyboardNavigation';
import { useClickOutside } from './useClickOutside';

export interface PhoneNumberFieldProps {
  value: string;
  onChange: (val: string) => void;
  matchedClient?: ClientProfile | null;
  clientPhoneNumbers?: string[];
  error?: string;
  required?: boolean;
  onStartNewNumber?: () => void;
}

export const PhoneNumberField: React.FC<PhoneNumberFieldProps> = React.memo(({
  value,
  onChange,
  matchedClient,
  clientPhoneNumbers = [],
  error,
  onStartNewNumber,
}) => {
  const [isCustomPhone, setIsCustomPhone] = useState<boolean>(false);
  const [showDefaultCountryCodeNotice, setShowDefaultCountryCodeNotice] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset custom phone entry mode if matched client changes
  React.useEffect(() => {
    setIsCustomPhone(false);
  }, [matchedClient?.id]);

  // Close dropdown on outside click
  useClickOutside(containerRef, () => setIsOpen(false), { enabled: isOpen });

  const initialIndex = useMemo(() => {
    const idx = clientPhoneNumbers.indexOf(value);
    return idx >= 0 ? idx : 0;
  }, [clientPhoneNumbers, value]);

  // Total selectable items: saved numbers + "+ Enter a new phone number..."
  const totalItemCount = clientPhoneNumbers.length + 1;

  const {
    activeIndex,
    setActiveIndex,
    itemRefs,
    handleKeyDown: handleListKeyDown,
  } = useListKeyboardNavigation<HTMLButtonElement>({
    itemCount: totalItemCount,
    isOpen,
    onSelect: (idx) => {
      if (idx < clientPhoneNumbers.length) {
        onChange(clientPhoneNumbers[idx]);
        setIsOpen(false);
        triggerRef.current?.focus();
      } else {
        setIsCustomPhone(true);
        onStartNewNumber?.();
        onChange('');
        setIsOpen(false);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    onClose: () => setIsOpen(false),
    triggerRef,
    initialIndex,
  });

  const handleDropdownKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    handleListKeyDown(e);
  };

  // If client has 2 or more numbers and user hasn't toggled to enter a custom new number:
  // Render custom dropdown matching ProductSelector/ClassificationSelector/StatusSelector!
  if (clientPhoneNumbers.length >= 2 && !isCustomPhone) {
    return (
      <div className="relative" ref={containerRef} onKeyDown={handleDropdownKeyDown}>
        {/* Accessible Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full px-3.5 py-2.5 text-sm font-medium bg-white dark:bg-slate-800 border rounded-xl shadow-2xs focus:outline-none cursor-pointer flex items-center justify-between text-left transition-colors ${
            !value ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100 font-semibold font-mono'
          } ${
            error
              ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
              : isOpen
              ? 'border-fotoblue-500 ring-2 ring-fotoblue-500/20 dark:ring-fotoblue-400/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="truncate flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400 shrink-0" />
            {value ? (
              <span className="font-mono">{value}</span>
            ) : (
              <span className="font-sans text-slate-400 dark:text-slate-500">
                -- Select Phone Number ({clientPhoneNumbers.length} saved) --
              </span>
            )}
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
            aria-label="Client Phone Numbers"
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn overscroll-contain"
          >
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 overscroll-contain">
              {clientPhoneNumbers.map((num, idx) => {
                const isSelected = value === num;
                const isActive = activeIndex === idx;
                return (
                  <button
                    key={num}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    type="button"
                    onClick={() => {
                      onChange(num);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer outline-none ${
                      isSelected
                        ? 'bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-900 dark:text-fotoblue-200 font-bold ring-1 ring-inset ring-fotoblue-500/50'
                        : isActive
                        ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 font-semibold ring-1 ring-inset ring-slate-300 dark:ring-slate-600'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate font-mono">
                      <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{num}</span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400 shrink-0" />}
                  </button>
                );
              })}

              {/* Option to enter a new phone number */}
              <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                {(() => {
                  const newIdx = clientPhoneNumbers.length;
                  const isActive = activeIndex === newIdx;
                  return (
                    <button
                      ref={(el) => {
                        itemRefs.current[newIdx] = el;
                      }}
                      role="option"
                      aria-selected={false}
                      tabIndex={-1}
                      type="button"
                      onClick={() => {
                        setIsCustomPhone(true);
                        onChange('');
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setActiveIndex(newIdx)}
                      className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-between transition-colors cursor-pointer border border-dashed outline-none ${
                        isActive
                          ? 'bg-fotoblue-100/80 dark:bg-fotoblue-950 text-fotoblue-700 dark:text-fotoblue-300 border-fotoblue-400 dark:border-fotoblue-600 ring-2 ring-fotoblue-500/30'
                          : 'text-fotoblue-600 dark:text-fotoblue-400 hover:bg-fotoblue-50 dark:hover:bg-fotoblue-950/50 border-fotoblue-300 dark:border-fotoblue-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <PlusCircle className="w-4 h-4 text-fotoblue-500" />
                        <span>+ Enter a new phone number...</span>
                      </div>
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
            {error}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
            <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{clientPhoneNumbers.length} numbers on file for <strong>{matchedClient?.name}</strong></span>
          </span>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setIsCustomPhone(true);
              onStartNewNumber?.();
              onChange('');
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="text-fotoblue-600 dark:text-fotoblue-400 hover:underline font-bold text-[11px] cursor-pointer"
          >
            + Add New Number
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="tel"
        inputMode="tel"
        placeholder={matchedClient ? "Enter new phone number (e.g. +1 234 567 8901)" : "Phone Number (e.g. +1 234 567 8901)"}
        value={value}
        onKeyDown={(e) => {
          if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
          }
        }}
        onChange={(e) => {
          const sanitized = sanitizePhoneInput(e.target.value);
          if (showDefaultCountryCodeNotice) {
            setShowDefaultCountryCodeNotice(false);
          }
          onChange(sanitized);
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (text) {
            const sanitized = sanitizePhoneInput(text);
            const digits = sanitized.replace(/\D/g, '');
            if (digits.length >= 7) {
              e.preventDefault();
              const formatted = formatPhoneNumber(sanitized);
              setShowDefaultCountryCodeNotice(didAppendUSCountryCode(sanitized, formatted));
              onChange(formatted);
            }
          }
        }}
        onBlur={(e) => {
          const val = e.target.value;
          if (val && val.trim()) {
            const sanitized = sanitizePhoneInput(val);
            const formatted = formatPhoneNumber(sanitized);
            setShowDefaultCountryCodeNotice(didAppendUSCountryCode(val, formatted));
            onChange(formatted);
          } else {
            setShowDefaultCountryCodeNotice(false);
          }
        }}
        className={`w-full px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border rounded-xl shadow-2xs focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
          error
            ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
            : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
        }`}
      />
      {showDefaultCountryCodeNotice && (
        <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11px] leading-tight transition-all">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <span>
            Defaulted to <strong>+1 (US/CA)</strong>. For other countries, include your country code prefix (e.g. <span className="font-mono font-semibold">+44</span>, <span className="font-mono font-semibold">+61</span>).
          </span>
        </div>
      )}

      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
        Auto-formats with country code (e.g. <span className="font-mono text-fotoblue-600 dark:text-fotoblue-400 font-semibold">+1 234 567 8901</span> or <span className="font-mono text-fotoblue-600 dark:text-fotoblue-400 font-semibold">+44 20 7946 0991</span>)
      </p>

      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
          {error}
        </p>
      )}

      {matchedClient && clientPhoneNumbers.length >= 2 ? (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            Entering new number for <strong>{matchedClient.name}</strong>
          </span>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setIsCustomPhone(false);
              onChange(clientPhoneNumbers[0] || '');
            }}
            className="text-fotoblue-600 dark:text-fotoblue-400 hover:underline font-bold text-[11px] cursor-pointer"
          >
            ← Choose from saved ({clientPhoneNumbers.length})
          </button>
        </div>
      ) : (
        matchedClient && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            {clientPhoneNumbers.length === 1 ? (
              !isCustomPhone ? (
                <>
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Known saved number: <strong className="font-mono text-slate-800 dark:text-slate-200">{clientPhoneNumbers[0]}</strong></span>
                  </span>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      setIsCustomPhone(true);
                      onStartNewNumber?.();
                      onChange('');
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="text-fotoblue-600 dark:text-fotoblue-400 hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    + Add / Change Number
                  </button>
                </>
              ) : (
                <>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Entering new number for <strong>{matchedClient.name}</strong>
                  </span>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      setIsCustomPhone(false);
                      onChange(clientPhoneNumbers[0] || '');
                    }}
                    className="text-fotoblue-600 dark:text-fotoblue-400 hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    ← Use saved number ({clientPhoneNumbers[0]})
                  </button>
                </>
              )
            ) : (
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                No phone on file for <strong>{matchedClient.name}</strong> • Enter number above to save it
              </span>
            )}
          </div>
        )
      )}
    </div>
  );
});
