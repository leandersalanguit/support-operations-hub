/**
 * @file pagination.ts
 * @description Reusable pagination utility functions and custom React hook
 * for managing tabular data pagination with selectable page sizes (10, 25, 50).
 */

import { useState, useMemo, useEffect } from 'react';

/** Supported page sizes */
export type PageSize = 10 | 25 | 50;

/** Supported page size choices as an array */
export const PAGE_SIZE_OPTIONS: readonly PageSize[] = [10, 25, 50] as const;

export interface UsePaginationOptions {
  /** Initial page size, defaults to 25 */
  defaultPageSize?: PageSize;
  /** Initial page number (1-indexed), defaults to 1 */
  initialPage?: number;
  /** Optional dependency array that resets current page to 1 when changed */
  resetDeps?: any[];
}

export interface PaginationResult<T> {
  /** Current active page number (1-indexed) */
  currentPage: number;
  /** Number of items displayed per page */
  pageSize: PageSize;
  /** Total number of pages */
  totalPages: number;
  /** Total item count in the input dataset */
  totalItems: number;
  /** 1-based index of the first item on current page (0 if empty) */
  fromItem: number;
  /** 1-based index of the last item on current page (0 if empty) */
  toItem: number;
  /** Sliced array of items for the current page */
  paginatedItems: T[];
  /** Page number navigation items including ellipsis indicators */
  pageRange: (number | '...')[];
  /** Whether the user can navigate to the previous page */
  canGoPrev: boolean;
  /** Whether the user can navigate to the next page */
  canGoNext: boolean;
  /** Set page size (10, 25, 50) and reset to page 1 */
  setPageSize: (size: PageSize) => void;
  /** Navigate directly to a specific page number */
  setCurrentPage: (page: number) => void;
  /** Navigate to the next page */
  goToNextPage: () => void;
  /** Navigate to the previous page */
  goToPrevPage: () => void;
  /** Navigate to the first page */
  goToFirstPage: () => void;
  /** Navigate to the last page */
  goToLastPage: () => void;
}

/**
 * Computes a pagination range with ellipses for large page numbers.
 * Example: [1, 2, 3, 4, 5, '...', 20] or [1, '...', 4, 5, 6, '...', 20]
 */
export function getPageRange(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Near the beginning: 1, 2, 3, 4, 5, ..., totalPages
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  // Near the end: 1, ..., totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  // In the middle: 1, ..., currentPage - 1, currentPage, currentPage + 1, ..., totalPages
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

/**
 * Custom hook to manage pagination state and slice an array of items.
 *
 * @param items - Full array of filtered/sorted items to paginate.
 * @param options - Pagination configuration (defaultPageSize, initialPage, resetDeps).
 * @returns Pagination controls and current page slice.
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): PaginationResult<T> {
  const { defaultPageSize = 25, initialPage = 1, resetDeps = [] } = options;

  const [pageSize, setPageSizeState] = useState<PageSize>(defaultPageSize);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 whenever resetDeps change
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  // Clamp current page if total pages decreases (e.g. after items are filtered or deleted)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const setPageSize = (size: PageSize) => {
    setPageSizeState(size);
    setCurrentPage(1);
  };

  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const fromItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const toItem = totalItems === 0 ? 0 : Math.min(safePage * pageSize, totalItems);

  const paginatedItems = useMemo(() => {
    if (totalItems === 0) return [];
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize, totalItems]);

  const pageRange = useMemo(() => {
    return getPageRange(safePage, totalPages);
  }, [safePage, totalPages]);

  const canGoPrev = safePage > 1;
  const canGoNext = safePage < totalPages;

  const goToNextPage = () => {
    if (canGoNext) setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPrevPage = () => {
    if (canGoPrev) setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);

  return {
    currentPage: safePage,
    pageSize,
    totalPages,
    totalItems,
    fromItem,
    toItem,
    paginatedItems,
    pageRange,
    canGoPrev,
    canGoNext,
    setPageSize,
    setCurrentPage,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
  };
}
