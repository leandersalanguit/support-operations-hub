/**
 * @file ProductSelector.tsx
 * @description Reusable product selector component highlighting owned products
 * using semantic optgroup categorization.
 * Uses a semantic, accessible native HTML select element with custom styling to ensure
 * fast type-ahead keyboard navigation, zero popover clipping, and full mobile accessibility.
 */

import React, { useMemo } from 'react';
import { Package, ChevronDown } from 'lucide-react';
import { ClientProfile } from '../../domain/client/types';

export interface ProductSelectorProps {
  value: string;
  onChange: (val: string) => void;
  products: string[];
  matchedClient?: ClientProfile | null;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export const ProductSelector: React.FC<ProductSelectorProps> = React.memo(({
  value,
  onChange,
  products,
  matchedClient,
  error,
  required = true,
  disabled = false,
}) => {
  const clientOwnedProducts = useMemo(() => {
    return matchedClient?.ownedProducts || [];
  }, [matchedClient]);

  const otherProducts = useMemo(() => {
    if (!clientOwnedProducts || clientOwnedProducts.length === 0) {
      return products;
    }
    return products.filter((p) => !clientOwnedProducts.includes(p));
  }, [clientOwnedProducts, products]);

  const isValueOwned = useMemo(() => {
    return Boolean(value && clientOwnedProducts.includes(value));
  }, [value, clientOwnedProducts]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor="product-hardware-select"
          className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
        >
          <Package className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
          <span>Product / Hardware</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>

        {matchedClient && clientOwnedProducts.length > 0 && (
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span>⭐ {clientOwnedProducts.length} Owned</span>
          </span>
        )}
      </div>

      <div className="relative">
        {isValueOwned && (
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
            aria-hidden="true"
          >
            ⭐
          </span>
        )}
        <select
          id="product-hardware-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full ${isValueOwned ? 'pl-8' : 'px-3.5'} pr-9 py-2.5 text-sm font-semibold bg-white dark:bg-slate-800 border rounded-xl shadow-2xs focus:outline-none cursor-pointer appearance-none transition-colors ${
            !value ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
          } ${
            error
              ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500">
            -- Select Product --
          </option>
          {clientOwnedProducts.length > 0 ? (
            <>
              <optgroup
                label={`⭐ Owned by ${matchedClient?.name || 'Client'} (${clientOwnedProducts.length})`}
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
              >
                {clientOwnedProducts.map((prod) => (
                  <option
                    key={prod}
                    value={prod}
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    ⭐ {prod} (Owned)
                  </option>
                ))}
              </optgroup>
              {otherProducts.length > 0 && (
                <optgroup
                  label={`Other Available Products (${otherProducts.length})`}
                  className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal"
                >
                  {otherProducts.map((prod) => (
                    <option
                      key={prod}
                      value={prod}
                      className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      {prod}
                    </option>
                  ))}
                </optgroup>
              )}
            </>
          ) : (
            products.map((prod) => (
              <option
                key={prod}
                value={prod}
                className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                {prod}
              </option>
            ))
          )}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
      </div>

      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
          {error}
        </p>
      )}
    </div>
  );
});
