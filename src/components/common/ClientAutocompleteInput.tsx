/**
 * @file ClientAutocompleteInput.tsx
 * @description Reusable client autocomplete input with popover suggestions,
 * keyboard navigation (up/down/enter/escape), and known client badge indicator.
 */

import React, { useState, useRef, useMemo } from 'react';
import { Building2, Check } from 'lucide-react';
import { ClientProfile } from '../../domain/client/types';
import { useListKeyboardNavigation } from './useListKeyboardNavigation';
import { useClickOutside } from './useClickOutside';

export interface ClientAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelectClient?: (client: ClientProfile) => void;
  clients?: ClientProfile[];
  error?: string;
  placeholder?: string;
  required?: boolean;
  /** Whether to show the "Known Client" badge in the label header (default: true) */
  showKnownBadge?: boolean;
  /** Whether to use compact input padding (py-1.5 vs py-2.5) */
  compact?: boolean;
}

export const ClientAutocompleteInput: React.FC<ClientAutocompleteInputProps> = React.memo(({
  value,
  onChange,
  onSelectClient,
  clients = [],
  error,
  placeholder = 'e.g. Apex Photo Co. / Jane Smith',
  required = true,
  showKnownBadge = true,
  compact = false,
}) => {
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const matchedClient = useMemo(() => {
    if (!clients || !value) return null;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return null;
    return clients.find((c) => c.name.toLowerCase() === trimmed) || null;
  }, [clients, value]);

  const suggestions = useMemo(() => {
    if (!clients || !value) return [];
    const trimmed = value.trim().toLowerCase();
    if (trimmed.length < 3) return [];
    if (matchedClient && matchedClient.name.toLowerCase() === trimmed) return [];

    return clients
      .filter((c) => {
        const nameMatches = c.name.toLowerCase().includes(trimmed);
        const phoneMatches =
          (c.phoneNumbers && c.phoneNumbers.some((p) => p.toLowerCase().includes(trimmed))) ||
          (c.phoneNumber && c.phoneNumber.toLowerCase().includes(trimmed));
        return nameMatches || phoneMatches;
      })
      .slice(0, 6);
  }, [clients, value, matchedClient]);

  const clientOwnedProducts = matchedClient?.ownedProducts || [];

  const handleSelect = (client: ClientProfile) => {
    onChange(client.name);
    setShowSuggestions(false);
    resetActiveIndex();
    inputRef.current?.focus();
    if (onSelectClient) {
      onSelectClient(client);
    }
  };

  const {
    activeIndex: selectedIndex,
    setActiveIndex: setSelectedIndex,
    itemRefs,
    handleKeyDown: handleSuggestionKeyDown,
    resetActiveIndex,
  } = useListKeyboardNavigation<HTMLDivElement>({
    itemCount: suggestions.length,
    isOpen: showSuggestions,
    onSelect: (idx) => {
      if (suggestions[idx]) {
        handleSelect(suggestions[idx]);
      }
    },
    onClose: () => {
      setShowSuggestions(false);
      resetActiveIndex();
    },
    triggerRef: inputRef,
    initialIndex: -1,
  });

  // Click outside listener
  useClickOutside(containerRef, () => {
    setShowSuggestions(false);
    resetActiveIndex();
  }, { enabled: showSuggestions });

  const handleContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setShowSuggestions(false);
      resetActiveIndex();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSuggestionKeyDown(e);
        return;
      }
      // When Enter is pressed without an active highlighted suggestion,
      // close suggestions and let the event bubble to the form navigation handler.
      setShowSuggestions(false);
      resetActiveIndex();
      return;
    }
    handleSuggestionKeyDown(e);
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, _idx: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      setShowSuggestions(true);
      resetActiveIndex();
      inputRef.current?.focus();
      onChange(value.slice(0, -1));
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setShowSuggestions(true);
      resetActiveIndex();
      inputRef.current?.focus();
      onChange(value + e.key);
    } else {
      handleSuggestionKeyDown(e);
    }
  };

  return (
    <div className="relative" ref={containerRef} onBlur={handleContainerBlur}>
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Building2 className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400 shrink-0" />
          <span>Client / Company Name</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </span>
        {showKnownBadge && matchedClient && (
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 normal-case tracking-normal shrink-0">
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Known Client{clientOwnedProducts.length > 0 ? ` • ${clientOwnedProducts.length} owned` : ''}</span>
          </span>
        )}
      </label>

      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showSuggestions && suggestions.length > 0}
        aria-controls="client-suggestions-list"
        aria-activedescendant={
          selectedIndex >= 0 && suggestions[selectedIndex]
            ? `client-suggestion-${suggestions[selectedIndex].id}`
            : undefined
        }
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        }}
        onKeyDown={handleInputKeyDown}
        className={`w-full ${compact ? 'px-3 py-1.5' : 'px-3.5 py-2.5'} text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border rounded-xl shadow-2xs focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
          error
            ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
            : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
        }`}
      />

      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
          {error}
        </p>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div
          id="client-suggestions-list"
          role="listbox"
          aria-label="Client suggestions"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-fadeIn"
        >
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between select-none">
            <span>Matching Clients ({suggestions.length})</span>
            <span className="text-[9px] font-normal lowercase">Tab / ↑↓ navigate • Enter select</span>
          </div>
          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-slate-800/50">
            {suggestions.map((suggestion, idx) => {
              const isSelected = selectedIndex === idx;
              const phone = (suggestion.phoneNumbers && suggestion.phoneNumbers[0]) || suggestion.phoneNumber;
              return (
                <div
                  key={suggestion.id}
                  id={`client-suggestion-${suggestion.id}`}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(suggestion);
                  }}
                  onKeyDown={(e) => handleItemKeyDown(e, idx)}
                  className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between gap-2 text-xs outline-none ${
                    isSelected
                      ? 'bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-950 dark:text-fotoblue-100 ring-1 ring-inset ring-fotoblue-500/50'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-fotoblue-500 shrink-0" />
                      <span className="truncate">{suggestion.name}</span>
                    </div>
                    {suggestion.ownedProducts && suggestion.ownedProducts.length > 0 && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {suggestion.ownedProducts.slice(0, 3).join(', ')}
                        {suggestion.ownedProducts.length > 3 ? ` +${suggestion.ownedProducts.length - 3}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {phone && (
                      <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {phone}
                      </span>
                    )}
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {suggestion.ownedProducts?.length || 0} owned
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
