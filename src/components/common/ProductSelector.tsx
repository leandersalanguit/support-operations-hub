/**
 * @file ProductSelector.tsx
 * @description Reusable product selector component highlighting owned products
 * with an expandable "Add Product" catalog for unowned products.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, PlusCircle, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { ClientProfile } from '../../domain/client/types';
import { useListKeyboardNavigation } from './useListKeyboardNavigation';
import { useClickOutside } from './useClickOutside';

export interface ProductSelectorProps {
  value: string;
  onChange: (val: string) => void;
  products: string[];
  matchedClient?: ClientProfile | null;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

type DropdownItem =
  | { type: 'product'; value: string; isOwned: boolean }
  | { type: 'add_different_product' };

export const ProductSelector: React.FC<ProductSelectorProps> = React.memo(({
  value,
  onChange,
  products,
  matchedClient,
  error,
  required = true,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isAddingProduct, setIsAddingProduct] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const clientOwnedProducts = useMemo(() => {
    return matchedClient?.ownedProducts || [];
  }, [matchedClient]);

  const otherProducts = useMemo(() => {
    if (!clientOwnedProducts || clientOwnedProducts.length === 0) {
      return products;
    }
    return products.filter((p) => !clientOwnedProducts.includes(p));
  }, [clientOwnedProducts, products]);

  // Build the flat list of interactive items currently visible in the dropdown
  const items: DropdownItem[] = useMemo(() => {
    if (clientOwnedProducts.length > 0) {
      if (!isAddingProduct) {
        const list: DropdownItem[] = clientOwnedProducts.map((p) => ({
          type: 'product',
          value: p,
          isOwned: true,
        }));
        if (otherProducts.length > 0) {
          list.push({ type: 'add_different_product' });
        }
        return list;
      } else {
        return [
          ...clientOwnedProducts.map((p) => ({
            type: 'product' as const,
            value: p,
            isOwned: true,
          })),
          ...otherProducts.map((p) => ({
            type: 'product' as const,
            value: p,
            isOwned: false,
          })),
        ];
      }
    }
    return products.map((p) => ({
      type: 'product' as const,
      value: p,
      isOwned: false,
    }));
  }, [clientOwnedProducts, otherProducts, products, isAddingProduct]);

  // If the current value belongs to otherProducts, auto-expand isAddingProduct
  useEffect(() => {
    if (value && otherProducts.includes(value)) {
      setIsAddingProduct(true);
    }
  }, [value, otherProducts]);

  const initialIndex = useMemo(() => {
    const idx = items.findIndex((it) => it.type === 'product' && it.value === value);
    return idx >= 0 ? idx : 0;
  }, [items, value]);

  const handleSelectProduct = (prod: string) => {
    onChange(prod);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleExpandAddProduct = () => {
    setIsAddingProduct(true);
    const nextIdx = clientOwnedProducts.length;
    setActiveIndex(nextIdx);
    setTimeout(() => {
      focusItem(nextIdx);
    }, 0);
  };

  const {
    activeIndex,
    setActiveIndex,
    itemRefs,
    handleKeyDown: handleListKeyDown,
    focusItem,
  } = useListKeyboardNavigation<HTMLButtonElement>({
    itemCount: items.length,
    isOpen,
    onSelect: (idx) => {
      const item = items[idx];
      if (item.type === 'product') {
        handleSelectProduct(item.value);
      } else if (item.type === 'add_different_product') {
        handleExpandAddProduct();
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
          <Package className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
          <span>Product / Hardware</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>

        {matchedClient && clientOwnedProducts.length > 0 && otherProducts.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (!isAddingProduct) {
                setIsAddingProduct(true);
                setIsOpen(true);
                const nextIdx = clientOwnedProducts.length;
                setActiveIndex(nextIdx);
                setTimeout(() => {
                  itemRefs.current[nextIdx]?.focus();
                  itemRefs.current[nextIdx]?.scrollIntoView({ block: 'nearest' });
                }, 0);
              } else {
                setIsAddingProduct(false);
                setActiveIndex(0);
              }
            }}
            className="text-fotoblue-600 dark:text-fotoblue-400 hover:underline font-bold text-[11px] cursor-pointer flex items-center gap-1"
          >
            {isAddingProduct ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Owned Only</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Add Product</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Custom Dropdown Trigger */}
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
        <span className="truncate flex items-center gap-2">
          {value ? (
            <>
              <span>{value}</span>
              {clientOwnedProducts.includes(value) && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                  Owned
                </span>
              )}
            </>
          ) : (
            <span>-- Select Product --</span>
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
          aria-label="Products"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn overscroll-contain"
        >
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 overscroll-contain">
            {clientOwnedProducts.length > 0 ? (
              <>
                {/* 1. Owned Products Group */}
                <div>
                  <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>⭐ Owned by {matchedClient?.name || 'Client'} ({clientOwnedProducts.length})</span>
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    {clientOwnedProducts.map((prod, ownedIdx) => {
                      const idx = ownedIdx;
                      const isSelected = value === prod;
                      const isActive = activeIndex === idx;
                      return (
                        <button
                          key={prod}
                          ref={(el) => { itemRefs.current[idx] = el; }}
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={-1}
                          type="button"
                          onClick={() => handleSelectProduct(prod)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer outline-none ${
                            isSelected
                              ? 'bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-900 dark:text-fotoblue-200 font-bold ring-1 ring-inset ring-fotoblue-500/50'
                              : isActive
                              ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 font-semibold ring-1 ring-inset ring-slate-300 dark:ring-slate-600'
                              : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-medium'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className="text-amber-500 text-xs">⭐</span>
                            <span className="truncate">{prod}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                              Owned
                            </span>
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Add Different Product Section */}
                {otherProducts.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                    {!isAddingProduct ? (
                      (() => {
                        const addIdx = clientOwnedProducts.length;
                        const isActive = activeIndex === addIdx;
                        return (
                          <button
                            ref={(el) => { itemRefs.current[addIdx] = el; }}
                            role="option"
                            aria-selected={false}
                            tabIndex={-1}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleExpandAddProduct();
                            }}
                            onMouseEnter={() => setActiveIndex(addIdx)}
                            className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-between transition-colors cursor-pointer border border-dashed outline-none ${
                              isActive
                                ? 'bg-fotoblue-100/80 dark:bg-fotoblue-950 text-fotoblue-700 dark:text-fotoblue-300 border-fotoblue-400 dark:border-fotoblue-600 ring-2 ring-fotoblue-500/30'
                                : 'text-fotoblue-600 dark:text-fotoblue-400 hover:bg-fotoblue-50 dark:hover:bg-fotoblue-950/50 border-fotoblue-300 dark:border-fotoblue-700/60'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <PlusCircle className="w-4 h-4 text-fotoblue-500" />
                              <span>Add Different Product...</span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                              +{otherProducts.length} more
                            </span>
                          </button>
                        );
                      })()
                    ) : (
                      <div>
                        <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <PlusCircle className="w-3 h-3 text-fotoblue-500" />
                            <span>All Available Products ({otherProducts.length})</span>
                          </span>
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsAddingProduct(false);
                              setActiveIndex(0);
                            }}
                            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:underline normal-case font-medium cursor-pointer"
                          >
                            Show Owned Only
                          </button>
                        </div>
                        <div className="space-y-0.5 mt-0.5">
                          {otherProducts.map((prod, otherIdx) => {
                            const idx = clientOwnedProducts.length + otherIdx;
                            const isSelected = value === prod;
                            const isActive = activeIndex === idx;
                            return (
                              <button
                                key={prod}
                                ref={(el) => { itemRefs.current[idx] = el; }}
                                role="option"
                                aria-selected={isSelected}
                                tabIndex={-1}
                                type="button"
                                onClick={() => handleSelectProduct(prod)}
                                onMouseEnter={() => setActiveIndex(idx)}
                                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer outline-none ${
                                  isSelected
                                    ? 'bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-900 dark:text-fotoblue-200 font-bold ring-1 ring-inset ring-fotoblue-500/50'
                                    : isActive
                                    ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 font-semibold ring-1 ring-inset ring-slate-300 dark:ring-slate-600'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-medium'
                                }`}
                              >
                                <span>+ Add {prod}</span>
                                {isSelected && <Check className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* No client-owned products: show all products directly */
              <div className="space-y-0.5">
                {products.map((prod, idx) => {
                  const isSelected = value === prod;
                  const isActive = activeIndex === idx;
                  return (
                    <button
                      key={prod}
                      ref={(el) => { itemRefs.current[idx] = el; }}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={-1}
                      type="button"
                      onClick={() => handleSelectProduct(prod)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer outline-none ${
                        isSelected
                          ? 'bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-900 dark:text-fotoblue-200 font-bold ring-1 ring-inset ring-fotoblue-500/50'
                          : isActive
                          ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 font-semibold ring-1 ring-inset ring-slate-300 dark:ring-slate-600'
                          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-medium'
                      }`}
                    >
                      <span>{prod}</span>
                      {isSelected && <Check className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
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
