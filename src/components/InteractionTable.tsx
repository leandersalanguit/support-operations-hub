/**
 * @file InteractionTable.tsx
 * @description Comprehensive data table component for viewing, filtering, sorting, and exporting shift interaction logs.
 * Decomposed into focused subcomponents (InteractionTableFilterBar, InteractionTableRow, InteractionTablePagination).
 * @exports InteractionTable
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Interaction } from '../types';
import { useTaxonomies } from '../application';
import { getTodayDateString } from '../utils/date';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useClipboardCopy } from '../utils/clipboard';
import { scrollToTopSmooth, scrollToBottomSmooth } from '../utils/scroll';
import { filterAndSortInteractions } from '../utils/interactionFilters';
import { formatInteractionForExcelClipboard } from '../infrastructure/export/spreadsheetExporter';
import { UserRole } from '../domain';
import { usePagination } from '../utils/pagination';
import {
  InteractionTableFilterBar,
  InteractionTableRow,
  InteractionTablePagination,
} from './interaction-table';

/**
 * @interface InteractionTableProps
 * @description Defines the props for the InteractionTable component.
 */
interface InteractionTableProps {
  /** Array of interaction records to be displayed in the table */
  interactions: Interaction[];
  /** Current authenticated user object */
  currentUser?: any;
  /** Current user role */
  userRole?: UserRole;
  /** Current agent display name */
  currentAgentName?: string;
  /** Callback function triggered when the user clicks the edit button on a row */
  onEdit: (interaction: Interaction) => void;
  /** Callback function triggered when the user clicks the delete button on a row */
  onDelete: (interaction: Interaction) => void;
}

const GOOGLE_SHEETS_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL;

/**
 * @component InteractionTable
 * @description A comprehensive data table for viewing, filtering, sorting, and exporting shift interaction logs.
 */
export const InteractionTable: React.FC<InteractionTableProps> = React.memo(({
  interactions,
  currentUser,
  userRole,
  currentAgentName,
  onEdit,
  onDelete,
}) => {
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState<string>(getTodayDateString());
  const [inEventOnly, setInEventOnly] = useState<boolean>(false);
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const cancelScrollRef = useRef<(() => void) | null>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  // Clean up animations on unmount
  useEffect(() => {
    return () => {
      if (cancelScrollRef.current) cancelScrollRef.current();
    };
  }, []);

  const { products: catalogProducts, supportTiers } = useTaxonomies();
  const availableProducts = useMemo(() => {
    const set = new Set<string>(catalogProducts);
    interactions.forEach((i) => {
      if (i.clientProduct) set.add(i.clientProduct);
    });
    return Array.from(set);
  }, [catalogProducts, interactions]);

  const { isCopied, copy: copyRow } = useClipboardCopy(2000);

  const handleCopyRow = (item: Interaction) => {
    copyRow(formatInteractionForExcelClipboard(item, supportTiers), item.id);
  };

  const toggleNoteExpand = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDateSort = () => {
    setDateSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleScrollToTop = () => {
    if (cancelScrollRef.current) cancelScrollRef.current();
    cancelScrollRef.current = scrollToTopSmooth(600);
  };

  const handleScrollToBottom = () => {
    if (cancelScrollRef.current) cancelScrollRef.current();
    cancelScrollRef.current = scrollToBottomSmooth(paginationRef.current, 600);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedChannel('ALL');
    setSelectedStatus('ALL');
    setSelectedProduct('ALL');
    setDateFilter('ALL');
    setInEventOnly(false);
    setDateSortOrder('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedChannel !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedProduct !== 'ALL' ||
    dateFilter !== 'ALL' ||
    inEventOnly ||
    dateSortOrder !== 'desc';

  const filteredInteractions = useMemo(() => {
    return filterAndSortInteractions(
      interactions,
      {
        searchTerm,
        dateFilter,
        customDate,
        selectedChannel,
        selectedStatus,
        selectedProduct,
        inEventOnly,
      },
      dateSortOrder
    );
  }, [
    interactions,
    searchTerm,
    dateFilter,
    customDate,
    selectedChannel,
    selectedStatus,
    selectedProduct,
    inEventOnly,
    dateSortOrder,
  ]);

  const {
    currentPage,
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
  } = usePagination(filteredInteractions, {
    defaultPageSize: 25,
    resetDeps: [
      searchTerm,
      selectedChannel,
      selectedStatus,
      selectedProduct,
      dateFilter,
      customDate,
      inEventOnly,
      dateSortOrder,
    ],
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Top Filter & Control Bar */}
      <InteractionTableFilterBar
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        customDate={customDate}
        onCustomDateChange={setCustomDate}
        selectedChannel={selectedChannel}
        onChannelChange={setSelectedChannel}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        dateSortOrder={dateSortOrder}
        onToggleDateSort={toggleDateSort}
        inEventOnly={inEventOnly}
        onToggleInEventOnly={() => setInEventOnly(!inEventOnly)}
        selectedProduct={selectedProduct}
        onProductChange={setSelectedProduct}
        availableProducts={availableProducts}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={clearAllFilters}
        onScrollToBottom={handleScrollToBottom}
        googleSheetsUrl={GOOGLE_SHEETS_URL}
      />

      {/* Main Table Display */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-200/60 dark:divide-slate-800/60">
              <th className="py-3 px-3.5 w-28 sm:w-32 text-center whitespace-nowrap">
                <button
                  type="button"
                  onClick={toggleDateSort}
                  className="inline-flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-fotoblue-700 dark:hover:text-fotoblue-400 transition-colors cursor-pointer group select-none mx-auto"
                  title="Click to sort by date"
                >
                  <span>Date & Day</span>
                  <div className="flex items-center text-slate-400 dark:text-slate-500 group-hover:text-fotoblue-600 dark:group-hover:text-fotoblue-400">
                    {dateSortOrder === 'desc' ? (
                      <ArrowDown className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400 font-bold" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400 font-bold" />
                    )}
                  </div>
                </button>
              </th>
              <th className="py-3 px-3 w-40 sm:w-48 text-center whitespace-nowrap">Client & Agent</th>
              <th className="py-3 px-3 w-32 sm:w-36 text-center whitespace-nowrap">Channel & Details</th>
              <th className="py-3 px-3 w-32 sm:w-36 text-center whitespace-nowrap">Product & Case</th>
              <th className="py-3 px-2 w-22 sm:w-26 text-center whitespace-nowrap">Status</th>
              <th className="py-3 px-2 w-20 sm:w-24 text-center whitespace-nowrap">Details</th>
              <th className="py-3 px-3 min-w-[200px] text-center">Notes</th>
              <th className="py-3 px-2 w-20 sm:w-22 text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-sm">
            {filteredInteractions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <p className="text-base font-bold text-slate-600 dark:text-slate-300">No interaction logs found</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    {hasActiveFilters
                      ? 'Try clearing filters or search query'
                      : 'Log your first interaction using the form above'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
                <InteractionTableRow
                  key={item.id}
                  item={item}
                  supportTiers={supportTiers}
                  currentUser={currentUser}
                  userRole={userRole}
                  currentAgentName={currentAgentName}
                  isNoteExpanded={!!expandedNotes[item.id]}
                  onToggleNoteExpand={toggleNoteExpand}
                  onCopyRow={handleCopyRow}
                  isCopied={isCopied(item.id)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Pagination & Scroll to Top */}
      <InteractionTablePagination
        totalItems={totalItems}
        fromItem={fromItem}
        toItem={toItem}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        pageRange={pageRange}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        setPageSize={setPageSize}
        setCurrentPage={setCurrentPage}
        goToNextPage={goToNextPage}
        goToPrevPage={goToPrevPage}
        goToFirstPage={goToFirstPage}
        goToLastPage={goToLastPage}
        onScrollToTop={handleScrollToTop}
        containerRef={paginationRef}
        cancelScrollRef={cancelScrollRef}
      />
    </div>
  );
});
