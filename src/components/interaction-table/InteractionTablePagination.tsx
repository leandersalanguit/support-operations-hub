/**
 * @file InteractionTablePagination.tsx
 * @description Table footer with pagination navigation, entries per page selector,
 * smooth scroll to top, and accessible focus management across page updates.
 */

import React, { useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
} from 'lucide-react';
import { PAGE_SIZE_OPTIONS, PageSize } from '../../utils/pagination';
import { scrollToBottomSmooth } from '../../utils/scroll';

export interface InteractionTablePaginationProps {
  totalItems: number;
  fromItem: number;
  toItem: number;
  currentPage: number;
  pageSize: PageSize;
  totalPages: number;
  pageRange: (number | '...')[];
  canGoPrev: boolean;
  canGoNext: boolean;
  setPageSize: (size: PageSize) => void;
  setCurrentPage: (page: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  onScrollToTop: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  cancelScrollRef?: React.MutableRefObject<(() => void) | null>;
}

export const InteractionTablePagination: React.FC<InteractionTablePaginationProps> = React.memo(({
  totalItems,
  fromItem,
  toItem,
  currentPage,
  pageSize,
  totalPages,
  pageRange,
  canGoPrev,
  canGoNext,
  setPageSize,
  setCurrentPage,
  goToNextPage,
  goToPrevPage,
  goToFirstPage,
  goToLastPage,
  onScrollToTop,
  containerRef,
  cancelScrollRef: externalCancelScrollRef,
}) => {
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const lastButtonRef = useRef<HTMLButtonElement>(null);
  const activePageButtonRef = useRef<HTMLButtonElement>(null);
  const lastInteractedPaginationRef = useRef<string | null>(null);
  const pageSizeButtonsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const internalCancelScrollRef = useRef<(() => void) | null>(null);
  const cancelScrollRef = externalCancelScrollRef || internalCancelScrollRef;

  useEffect(() => {
    return () => {
      if (cancelScrollRef.current) cancelScrollRef.current();
    };
  }, [cancelScrollRef]);

  // Maintain focus on the pagination buttons across page and size updates
  useEffect(() => {
    const action = lastInteractedPaginationRef.current;
    if (!action) return;

    // Run after DOM paint so elements and disabled states are updated
    requestAnimationFrame(() => {
      if (action === 'next') {
        if (nextButtonRef.current && !nextButtonRef.current.disabled) {
          nextButtonRef.current.focus({ preventScroll: true });
        } else if (activePageButtonRef.current) {
          activePageButtonRef.current.focus({ preventScroll: true });
        } else if (prevButtonRef.current && !prevButtonRef.current.disabled) {
          prevButtonRef.current.focus({ preventScroll: true });
        }
      } else if (action === 'prev') {
        if (prevButtonRef.current && !prevButtonRef.current.disabled) {
          prevButtonRef.current.focus({ preventScroll: true });
        } else if (activePageButtonRef.current) {
          activePageButtonRef.current.focus({ preventScroll: true });
        } else if (nextButtonRef.current && !nextButtonRef.current.disabled) {
          nextButtonRef.current.focus({ preventScroll: true });
        }
      } else if (action === 'first') {
        if (activePageButtonRef.current) {
          activePageButtonRef.current.focus({ preventScroll: true });
        } else if (nextButtonRef.current && !nextButtonRef.current.disabled) {
          nextButtonRef.current.focus({ preventScroll: true });
        }
      } else if (action === 'last') {
        if (activePageButtonRef.current) {
          activePageButtonRef.current.focus({ preventScroll: true });
        } else if (prevButtonRef.current && !prevButtonRef.current.disabled) {
          prevButtonRef.current.focus({ preventScroll: true });
        }
      } else if (action === 'page') {
        if (activePageButtonRef.current) {
          activePageButtonRef.current.focus({ preventScroll: true });
        }
      } else if (action.startsWith('size-')) {
        const size = Number(action.replace('size-', ''));
        const btn = pageSizeButtonsRef.current.get(size);
        if (btn) {
          btn.focus({ preventScroll: true });
        }
      }

      // If the table grew taller and pushed footer below viewport, smoothly scroll down
      const currentContainer = containerRef?.current;
      if (currentContainer) {
        const rect = currentContainer.getBoundingClientRect();
        if (rect.bottom > window.innerHeight + 10) {
          if (cancelScrollRef.current) cancelScrollRef.current();
          cancelScrollRef.current = scrollToBottomSmooth(currentContainer, 500);
        }
      }

      lastInteractedPaginationRef.current = null;
    });
  }, [currentPage, pageSize, containerRef]);

  return (
    <div
      ref={containerRef as any}
      tabIndex={-1}
      className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3.5 outline-none"
    >
      {/* Left: Summary & Page Size Choices */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3.5 text-xs text-slate-500 dark:text-slate-400 w-full md:w-auto">
        <span className="font-medium whitespace-nowrap">
          {totalItems === 0 ? (
            'Showing 0 logs'
          ) : (
            <>
              Showing{' '}
              <strong className="font-bold text-slate-800 dark:text-slate-100">
                {fromItem}–{toItem}
              </strong>{' '}
              of{' '}
              <strong className="font-bold text-slate-800 dark:text-slate-100">
                {totalItems}
              </strong>{' '}
              {totalItems === 1 ? 'log' : 'logs'}
            </>
          )}
        </span>

        {/* Page Size Selector */}
        <div className="flex items-center gap-1.5 font-medium whitespace-nowrap">
          <span className="text-slate-400 dark:text-slate-500">Show:</span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 p-0.5">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                ref={(el) => {
                  if (el) pageSizeButtonsRef.current.set(size, el);
                  else pageSizeButtonsRef.current.delete(size);
                }}
                type="button"
                onClick={() => {
                  lastInteractedPaginationRef.current = `size-${size}`;
                  setPageSize(size);
                }}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer focus:outline-none ${
                  pageSize === size
                    ? 'bg-white dark:bg-slate-900 text-fotoblue-600 dark:text-fotoblue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={`Show ${size} entries per page`}
                aria-label={`Show ${size} entries per page`}
              >
                {size}
              </button>
            ))}
          </div>
          <span className="text-slate-400 dark:text-slate-500">per page</span>
        </div>
      </div>

      {/* Center / Right: Pagination Controls & Back to Top */}
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full md:w-auto">
        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {/* First Page Button */}
            <button
              ref={firstButtonRef}
              type="button"
              onClick={() => {
                lastInteractedPaginationRef.current = 'first';
                goToFirstPage();
              }}
              disabled={!canGoPrev}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-fotoblue-600 dark:hover:text-fotoblue-400 focus:outline-none transition-colors shadow-2xs cursor-pointer"
              title="First page"
              aria-label="First page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Prev Page Button */}
            <button
              ref={prevButtonRef}
              type="button"
              onClick={() => {
                lastInteractedPaginationRef.current = 'prev';
                goToPrevPage();
              }}
              disabled={!canGoPrev}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-fotoblue-600 dark:hover:text-fotoblue-400 focus:outline-none transition-colors shadow-2xs cursor-pointer"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Page Number Buttons */}
            <div className="flex items-center gap-1">
              {pageRange.map((page, idx) => {
                if (page === '...') {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-1.5 py-0.5 text-xs text-slate-400 dark:text-slate-500 select-none font-bold"
                    >
                      …
                    </span>
                  );
                }
                const isCurrent = page === currentPage;
                return (
                  <button
                    key={page}
                    ref={isCurrent ? activePageButtonRef : undefined}
                    type="button"
                    onClick={() => {
                      lastInteractedPaginationRef.current = 'page';
                      setCurrentPage(page);
                    }}
                    className={`min-w-[28px] h-7 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs focus:outline-none ${
                      isCurrent
                        ? 'bg-fotoblue-600 border-fotoblue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-fotoblue-600 dark:hover:text-fotoblue-400'
                    }`}
                    aria-label={`Go to page ${page}`}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* Next Page Button */}
            <button
              ref={nextButtonRef}
              type="button"
              onClick={() => {
                lastInteractedPaginationRef.current = 'next';
                goToNextPage();
              }}
              disabled={!canGoNext}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-fotoblue-600 dark:hover:text-fotoblue-400 focus:outline-none transition-colors shadow-2xs cursor-pointer"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page Button */}
            <button
              ref={lastButtonRef}
              type="button"
              onClick={() => {
                lastInteractedPaginationRef.current = 'last';
                goToLastPage();
              }}
              disabled={!canGoNext}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-fotoblue-600 dark:hover:text-fotoblue-400 focus:outline-none transition-colors shadow-2xs cursor-pointer"
              title="Last page"
              aria-label="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Smooth Scroll to Top */}
        <button
          type="button"
          onClick={onScrollToTop}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-fotoblue-700 dark:hover:text-fotoblue-400 bg-white dark:bg-slate-800 hover:bg-fotoblue-50/50 dark:hover:bg-slate-700 active:scale-98 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer group whitespace-nowrap"
          title="Smooth scroll back to top of the page"
          aria-label="Smooth scroll back to top"
        >
          <span>Back to Top</span>
          <ArrowUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-fotoblue-600 dark:group-hover:text-fotoblue-400 transition-transform group-hover:-translate-y-0.5" />
        </button>
      </div>
    </div>
  );
});
