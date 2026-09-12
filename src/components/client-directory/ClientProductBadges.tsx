/**
 * @file ClientProductBadges.tsx
 * @description Renders owned product badges constrained to at most 2 lines,
 * with a dynamic '+N more' dropdown popover if there are additional products.
 */

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useClickOutside } from '../common';

export interface ClientProductBadgesProps {
  products: string[];
}

export const ClientProductBadges: React.FC<ClientProductBadgesProps> = ({ products }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(products.length);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMeasured, setIsMeasured] = useState(false);

  // Close dropdown on outside click or Escape
  useClickOutside(dropdownRef, () => setIsDropdownOpen(false), {
    enabled: isDropdownOpen,
    closeOnEscape: true,
  });

  // Measure visible badges that fit within 2 lines
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || products.length <= 1) {
      setVisibleCount(products.length);
      setIsMeasured(true);
      return;
    }

    const badges = Array.from(container.querySelectorAll<HTMLElement>('.product-badge'));
    if (badges.length === 0) return;

    // Detect distinct line tops by checking offsetTop
    const lineTops: number[] = [];
    badges.forEach((b) => {
      const top = b.offsetTop;
      if (!lineTops.some((t) => Math.abs(t - top) < 8)) {
        lineTops.push(top);
      }
    });
    lineTops.sort((a, b) => a - b);

    // If 2 or fewer lines, all currently rendered badges fit on 2 lines
    if (lineTops.length <= 2) {
      setIsMeasured(true);
      return;
    }

    // Line 3 starts at lineTops[2]
    const line3Top = lineTops[2];
    const line1And2Badges = badges.filter((b) => b.offsetTop < line3Top - 4);
    let countThatFit = line1And2Badges.length;

    // Ensure space on line 2 for the '+N more ▾' button (~72px)
    const lastBadge = line1And2Badges[line1And2Badges.length - 1];
    if (lastBadge) {
      const containerWidth = container.clientWidth;
      const badgeRight = lastBadge.offsetLeft + lastBadge.offsetWidth;
      if (containerWidth - badgeRight < 72 && countThatFit > 1) {
        countThatFit -= 1;
      }
    }

    const finalCount = Math.max(1, countThatFit);
    setVisibleCount(finalCount);
    setIsMeasured(true);
  }, [products, products.length]);

  // Recalculate on container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined' || products.length <= 1) return;

    let prevWidth = container.clientWidth;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (Math.abs(width - prevWidth) > 10) {
          prevWidth = width;
          setVisibleCount(products.length);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [products.length]);

  if (products.length === 0) {
    return <span className="text-xs text-slate-400 italic">No equipment recorded</span>;
  }

  const visibleProducts = products.slice(0, visibleCount);
  const hiddenProducts = products.slice(visibleCount);
  const hasMore = hiddenProducts.length > 0;

  return (
    <div
      ref={containerRef}
      className={`flex flex-wrap gap-1.5 items-center relative ${
        !isMeasured ? 'max-h-[56px] overflow-hidden' : ''
      }`}
    >
      {visibleProducts.map((prod) => (
        <span
          key={prod}
          className="product-badge text-[11px] font-semibold px-2 py-0.5 rounded-md bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-800 dark:text-fotoblue-300 border border-fotoblue-200/80 dark:border-fotoblue-800/60 whitespace-nowrap"
        >
          {prod}
        </span>
      ))}

      {hasMore && (
        <div className="relative inline-block" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`product-more-btn inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer whitespace-nowrap ${
              isDropdownOpen
                ? 'bg-fotoblue-600 text-white border-fotoblue-600 shadow-2xs'
                : 'bg-fotoblue-100/70 hover:bg-fotoblue-200/80 dark:bg-fotoblue-950/90 dark:hover:bg-fotoblue-900 text-fotoblue-800 dark:text-fotoblue-200 border-fotoblue-300/90 dark:border-fotoblue-700/90'
            }`}
            title={`Show ${hiddenProducts.length} more products`}
          >
            <span>+{hiddenProducts.length} more</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-150 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 z-50 w-64 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Additional Equipment ({hiddenProducts.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {hiddenProducts.map((prod) => (
                  <span
                    key={prod}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-800 dark:text-fotoblue-300 border border-fotoblue-200/80 dark:border-fotoblue-800/60 whitespace-nowrap"
                  >
                    {prod}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
