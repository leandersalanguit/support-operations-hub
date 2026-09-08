/**
 * @file InteractionTable.tsx
 * @description This file contains the InteractionTable component, which displays a data table of all logged customer interactions.
 * It provides extensive text search, filtering (by date, channel, status, product, in-event status), sorting, and export capabilities (CSV, Excel).
 * @exports InteractionTable
 */

import React, { useState, useMemo } from 'react';
import {
  Interaction,
  STATUS_OPTIONS,
} from '../types';
import { useTaxonomies } from '../application';
import { getTodayDateString } from '../utils/date';
import {
  Search,
  Phone,
  MessageSquare,
  Edit2,
  Trash2,
  Zap,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  ArrowDown,
  ArrowUp,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useClipboardCopy } from '../utils/clipboard';
import { scrollToTopSmooth, scrollToBottomSmooth } from '../utils/scroll';
import { filterAndSortInteractions } from '../utils/interactionFilters';
import { parseChannelDetails } from '../utils/channelDetails';
import { formatInteractionForExcelClipboard } from '../infrastructure/export/spreadsheetExporter';
import { formatAgentDisplayName, canModifyInteractionPolicy, UserRole } from '../domain';
import { usePagination, PAGE_SIZE_OPTIONS } from '../utils/pagination';

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

/**
 * @component InteractionTable
 * @description A comprehensive data table for viewing, filtering, sorting, and exporting shift interaction logs.
 * It manages multiple filter states and applies them sequentially before sorting the final result set.
 * 
 * @param {InteractionTableProps} props - The props for the component.
 * @returns {JSX.Element} The rendered data table component.
 */
/**
 * Helper to render channel details using parsed channel metadata.
 */
const renderChannelDetails = (details: string, channel: string) => {
  const parsed = parseChannelDetails(details, channel);

  if (parsed.type === 'empty') {
    return <span className="text-slate-400 dark:text-slate-500 font-mono text-xs mt-0.5 inline-block">—</span>;
  }

  if (parsed.url) {
    return (
      <a
        href={parsed.url}
        target="_blank"
        rel="noopener noreferrer"
        title={parsed.title || parsed.url}
        className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-fotodeep-700 dark:text-fotodeep-300 bg-fotodeep-50 dark:bg-fotodeep-950/60 hover:bg-fotodeep-100 dark:hover:bg-fotodeep-900/80 hover:text-fotodeep-900 dark:hover:text-fotodeep-100 border border-fotodeep-200/80 dark:border-fotodeep-800 px-1.5 py-0.5 rounded-md whitespace-nowrap transition-colors group cursor-pointer mt-0.5"
      >
        <span>{parsed.label}</span>
        <ExternalLink className="w-2.5 h-2.5 text-fotodeep-500 dark:text-fotodeep-400 group-hover:text-fotodeep-800 dark:group-hover:text-fotodeep-200 shrink-0" />
      </a>
    );
  }

  return (
    <div className="text-xs text-slate-700 dark:text-slate-300 font-mono mt-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/80 px-1.5 py-0.5 rounded-md whitespace-nowrap inline-block">
      {parsed.label}
    </div>
  );
};

const GOOGLE_SHEETS_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL;

export const InteractionTable: React.FC<InteractionTableProps> = React.memo(({
  interactions,
  currentUser,
  userRole,
  currentAgentName,
  onEdit,
  onDelete,
}) => {
  // State for text search across multiple fields
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // State for filtering by communication channel ('ALL', 'Call', 'Chat')
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  
  // State for filtering by interaction status
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  
  // State for filtering by product
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');
  const { products: catalogProducts } = useTaxonomies();
  const availableProducts = useMemo(() => {
    const set = new Set<string>(catalogProducts);
    interactions.forEach((i) => {
      if (i.clientProduct) set.add(i.clientProduct);
    });
    return Array.from(set);
  }, [catalogProducts, interactions]);
  
  // State for date filtering mode ('ALL', 'TODAY', 'CUSTOM')
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'CUSTOM'>('ALL');
  
  // State for the custom date picker value
  const [customDate, setCustomDate] = useState<string>(getTodayDateString());
  
  // State to toggle showing only in-event interactions
  const [inEventOnly, setInEventOnly] = useState<boolean>(false);
  
  // State for date sorting direction ('desc' = newest first, 'asc' = oldest first)
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // State to track which interaction notes are expanded (for texts > 70 characters)
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const cancelScrollRef = React.useRef<(() => void) | null>(null);
  const paginationRef = React.useRef<HTMLDivElement>(null);
  const prevButtonRef = React.useRef<HTMLButtonElement>(null);
  const nextButtonRef = React.useRef<HTMLButtonElement>(null);
  const firstButtonRef = React.useRef<HTMLButtonElement>(null);
  const lastButtonRef = React.useRef<HTMLButtonElement>(null);
  const activePageButtonRef = React.useRef<HTMLButtonElement>(null);
  const lastInteractedPaginationRef = React.useRef<string | null>(null);
  const pageSizeButtonsRef = React.useRef<Map<number, HTMLButtonElement>>(new Map());

  // Clean up animations on unmount
  React.useEffect(() => {
    return () => {
      if (cancelScrollRef.current) cancelScrollRef.current();
    };
  }, []);

  const { isCopied, copy: copyRow } = useClipboardCopy(2000);

  /**
   * @function handleCopyRow
   * @description Copies the interaction row in TSV format formatted for Excel spreadsheets.
   * @param {Interaction} item - The interaction record to copy.
   */
  const handleCopyRow = (item: Interaction) => {
    copyRow(formatInteractionForExcelClipboard(item), item.id);
  };

  /**
   * @function toggleNoteExpand
   * @description Toggles the expanded/collapsed state of a long note for a specific interaction.
   * @param {string} id - The unique identifier of the interaction.
   */
  const toggleNoteExpand = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /**
   * @function toggleDateSort
   * @description Toggles the sorting order of the interactions by date between ascending and descending.
   */
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

  /**
   * @constant filteredInteractions
   * @description Memoized list of interactions that have been filtered and sorted based on current state.
   */
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

  // ---------------------------------------------------------------------------
  // PAGINATION WORKFLOW (10, 25, 50 entries per page)
  // ---------------------------------------------------------------------------
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

  // Maintain focus on the pagination buttons across page and size updates
  React.useEffect(() => {
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

      // If the table grew taller (e.g. flipping from a 1-entry page to a 10-entry page,
      // or increasing page size) and pushed the footer below the screen,
      // smoothly scroll down so the user remains anchored to the pagination buttons
      if (paginationRef.current) {
        const rect = paginationRef.current.getBoundingClientRect();
        if (rect.bottom > window.innerHeight + 10) {
          if (cancelScrollRef.current) cancelScrollRef.current();
          cancelScrollRef.current = scrollToBottomSmooth(paginationRef.current, 500);
        }
      }

      lastInteractedPaginationRef.current = null;
    });
  }, [currentPage, pageSize]);

  /**
   * @function clearAllFilters
   * @description Resets all filter and search states to their default values.
   */
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

  // Determine if any filters are currently applied to optionally show the 'Reset Filters' button
  const hasActiveFilters =
    searchTerm !== '' ||
    selectedChannel !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedProduct !== 'ALL' ||
    dateFilter !== 'ALL' ||
    inEventOnly ||
    dateSortOrder !== 'desc';

  const renderStatusContent = (status: string) => {
    switch (status) {
      case 'Waiting for an update from client':
      case 'Waiting for update':
        return (
          <span className="flex flex-col leading-tight">
            <span>Waiting for</span>
            <span>update</span>
          </span>
        );
      case 'Provided an alternative solution':
      case 'Alternative solution':
        return (
          <span className="flex flex-col leading-tight">
            <span>Alternative</span>
            <span>solution</span>
          </span>
        );
      case 'Need to follow up':
      case 'Need follow-up':
        return (
          <span className="flex flex-col leading-tight">
            <span>Need</span>
            <span>follow-up</span>
          </span>
        );
      default:
        return <span className="leading-tight">{status}</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Table Top Controls & Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Interaction Logs
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              History of customer interactions logged during shifts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleScrollToBottom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-fotoblue-700 dark:hover:text-fotoblue-400 bg-slate-100/90 dark:bg-slate-800 hover:bg-fotoblue-50 dark:hover:bg-slate-700/80 active:scale-98 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer group whitespace-nowrap"
              title="Scroll to bottom to view pagination controls"
              aria-label="Scroll to bottom to view pagination controls"
            >
              <span>Scroll to Bottom</span>
              <ArrowDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-fotoblue-600 dark:group-hover:text-fotoblue-400 transition-transform group-hover:translate-y-0.5" />
            </button>

            {GOOGLE_SHEETS_URL && (
              <a
                href={GOOGLE_SHEETS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-98 border border-emerald-200/80 dark:border-emerald-800 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer"
              >
                <span>View on Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </a>
            )}
          </div>
        </div>

        {/* Primary Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-1">
          {/* Expanded Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-5">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search client, agent, product, ticket, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-1 sm:col-span-1 lg:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'ALL' | 'TODAY' | 'CUSTOM')}
              className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-fotoblue-500 focus:outline-none cursor-pointer transition-all shadow-2xs"
            >
              <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">All Dates</option>
              <option value="TODAY" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Today Only</option>
              <option value="CUSTOM" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Custom Date</option>
            </select>
            {/* Show custom date picker when 'CUSTOM' filter mode is selected */}
            {dateFilter === 'CUSTOM' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              />
            )}
          </div>

          {/* Channel Filter */}
          <div className="sm:col-span-1 lg:col-span-2">
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-fotoblue-500 focus:outline-none cursor-pointer transition-all shadow-2xs"
            >
              <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">All Channels</option>
              <option value="Call" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">📞 Calls Only</option>
              <option value="Chat" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">💬 Chats Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2 lg:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-fotoblue-500 focus:outline-none cursor-pointer transition-all shadow-2xs"
            >
              <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">All Statuses</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.label} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Toggles: Sorting, In Event Only, Product Filter, Clear */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Sort Toggle Button */}
            <button
              type="button"
              onClick={toggleDateSort}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer shadow-2xs ${
                dateSortOrder === 'asc'
                  ? 'bg-fotoblue-600 text-white border-fotoblue-600'
                  : 'bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-700 dark:text-fotoblue-300 hover:bg-fotoblue-100 dark:hover:bg-fotoblue-900/60 border-fotoblue-200 dark:border-fotoblue-800'
              }`}
              title="Click to toggle sorting order (Newest first / Oldest first)"
            >
              {dateSortOrder === 'desc' ? (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                  <span>Date: Newest First</span>
                </>
              ) : (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-white" />
                  <span>Date: Oldest First</span>
                </>
              )}
            </button>

            {/* In Event toggle filter */}
            <button
              type="button"
              onClick={() => setInEventOnly(!inEventOnly)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer shadow-2xs ${
                inEventOnly
                  ? 'bg-fotoblue-600 text-white border-fotoblue-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${inEventOnly ? 'text-amber-300' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>In Event Only</span>
            </button>

            {/* Product Quick Filter */}
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Product: All</option>
              {availableProducts.map((p) => (
                <option key={p} value={p} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  Product: {p}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-fotoblue-600 dark:text-fotoblue-400 hover:text-fotoblue-800 dark:hover:text-fotoblue-300 font-bold cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Display */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-200/60 dark:divide-slate-800/60">
              {/* Clickable Sortable Date Column Header */}
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
              // Empty State Message dynamically based on active filters
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
              // Render paginated interactions
              paginatedItems.map((item) => {
                const statusMeta =
                  STATUS_OPTIONS.find((s) => s.label === item.status) || STATUS_OPTIONS[0];
                const isNoteExpanded = !!expandedNotes[item.id];
                const isLongNote =
                  item.additionalNotes &&
                  (item.additionalNotes.length > 115 || (item.additionalNotes.match(/\n/g) || []).length >= 3);
                const canModify = canModifyInteractionPolicy(item.agent, currentUser, userRole, currentAgentName);
                const agentLabel = formatAgentDisplayName(item.agent) || item.agent || 'the authoring agent';

                return (
                  <tr key={item.id} className="hover:bg-fotoblue-50/20 dark:hover:bg-slate-800/60 transition-colors group divide-x divide-slate-100 dark:divide-slate-800/50">
                    {/* Date & Day Column */}
                    <td className="py-3.5 px-3.5 w-28 sm:w-32 align-middle whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{item.date}</div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{item.dayOfWeek || '—'}</span>
                      </div>
                    </td>

                    {/* Client & Agent Column */}
                    <td className="py-3.5 px-3 w-40 sm:w-48 align-middle">
                      <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug" title={item.clientName}>
                        {item.clientName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <span className="shrink-0">Agent:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate" title={item.agent}>
                          {formatAgentDisplayName(item.agent) || item.agent}
                        </span>
                      </div>
                    </td>

                    {/* Channel & Details Column */}
                    <td className="py-3.5 px-3 w-32 sm:w-36 align-middle">
                      <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm">
                        {item.channel === 'Call' ? (
                          <span className="flex items-center gap-1 text-fotoblue-700 dark:text-fotoblue-300 font-bold">
                            <Phone className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                            <span>Call</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-fotodeep-600 dark:text-fotodeep-300 font-bold">
                            <MessageSquare className="w-3.5 h-3.5 text-fotodeep-500 dark:text-fotodeep-400" />
                            <span>Chat</span>
                          </span>
                        )}
                      </div>
                      {renderChannelDetails(item.channelDetails, item.channel)}
                    </td>

                    {/* Product & Case Classification Column */}
                    <td className="py-3.5 px-3 w-32 sm:w-36 align-middle">
                      <div className="inline-block px-2 py-0.5 bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-900 dark:text-fotoblue-200 font-bold rounded-md text-[11px] border border-fotoblue-200/80 dark:border-fotoblue-800">
                        {item.clientProduct}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 leading-snug">
                        {item.caseClassification}
                      </div>
                    </td>

                    {/* Status Column with Standardized Badge Pill */}
                    <td className="py-2.5 px-1.5 w-22 sm:w-26 align-middle text-center">
                      <div className="flex items-center justify-center">
                        <span
                          title={item.status}
                          className={`w-full max-w-[88px] inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-semibold border ${statusMeta.badgeBg} ${statusMeta.badgeBorder}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dotColor}`} />
                          {renderStatusContent(item.status)}
                        </span>
                      </div>
                    </td>

                    {/* Details Flags Column - Standardized Metadata Status Indicators */}
                    <td className="py-2.5 px-2 w-20 sm:w-24 align-middle text-center">
                      <div className="flex flex-col items-center justify-center gap-1 select-none">
                        {/* Support License Indicator */}
                        <span
                          title={
                            item.license === 'support_active'
                              ? 'Support License: Valid'
                              : item.license === 'renewal_sent'
                              ? 'Support License: Inactive (Renewal Sent)'
                              : 'Support License: Inactive (Support Inactive)'
                          }
                          className={`w-full max-w-[70px] inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium border border-transparent ${
                            item.license === 'support_active'
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/40 font-semibold'
                              : item.license === 'renewal_sent'
                              ? 'text-purple-700 dark:text-purple-300 bg-purple-50/90 dark:bg-purple-950/40 font-semibold'
                              : 'text-slate-400 dark:text-slate-500 bg-slate-50/90 dark:bg-slate-800/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              item.license === 'support_active'
                                ? 'bg-emerald-500'
                                : item.license === 'renewal_sent'
                                ? 'bg-purple-500'
                                : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                          <span>
                            {item.license === 'support_active'
                              ? 'License'
                              : item.license === 'renewal_sent'
                              ? 'Renewal'
                              : 'Inactive'}
                          </span>
                        </span>

                        {/* In Event Indicator */}
                        <span
                          title={item.inEvent ? 'In Event: YES' : 'In Event: NO'}
                          className={`w-full max-w-[70px] inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium border border-transparent ${
                            item.inEvent
                              ? 'text-fotoblue-700 dark:text-fotoblue-300 bg-fotoblue-50/90 dark:bg-fotoblue-950/40 font-semibold'
                              : 'text-slate-400 dark:text-slate-500 bg-slate-50/90 dark:bg-slate-800/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              item.inEvent ? 'bg-fotoblue-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                          <span>Event</span>
                        </span>

                        {/* 1st Time User Indicator */}
                        <span
                          title={
                            item.firstTimeUser
                              ? 'First Time Using Product: YES'
                              : 'First Time Using Product: NO'
                          }
                          className={`w-full max-w-[70px] inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium border border-transparent ${
                            item.firstTimeUser
                              ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/40 font-semibold'
                              : 'text-slate-400 dark:text-slate-500 bg-slate-50/90 dark:bg-slate-800/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              item.firstTimeUser ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                          <span>1st User</span>
                        </span>
                      </div>
                    </td>

                    {/* Notes Column (flexible expansion, 3-line preview before expansion) */}
                    <td className="py-3.5 px-3 align-middle min-w-[200px]">
                      {item.additionalNotes ? (
                        <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                          <p
                            className={`whitespace-pre-wrap leading-relaxed ${
                              !isNoteExpanded && isLongNote ? 'line-clamp-3' : ''
                            }`}
                          >
                            {item.additionalNotes}
                          </p>
                          {isLongNote && (
                            <button
                              onClick={() => toggleNoteExpand(item.id)}
                              className="text-xs text-fotoblue-600 dark:text-fotoblue-400 hover:text-fotoblue-800 dark:hover:text-fotoblue-300 font-bold mt-1 flex items-center gap-0.5 cursor-pointer"
                            >
                              {isNoteExpanded ? (
                                <>
                                  <span>Show less</span>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  <span>Read more</span>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 italic text-xs">— No notes —</span>
                      )}
                    </td>

                    {/* Row Actions Column - Distinct Interactive Buttons */}
                    <td className="py-2.5 px-2 w-20 sm:w-22 align-middle text-center whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-1">
                        {/* Copy Button - Always active for all users */}
                        <button
                          type="button"
                          onClick={() => handleCopyRow(item)}
                          className={`w-full max-w-[62px] inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                            isCopied(item.id)
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-800'
                          }`}
                          title={isCopied(item.id) ? 'Copied to clipboard!' : 'Copy row for Excel'}
                          aria-label="Copy row for Excel"
                        >
                          {isCopied(item.id) ? (
                            <Check className="w-2.5 h-2.5 text-white shrink-0" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400 shrink-0" />
                          )}
                          <span>{isCopied(item.id) ? 'Copied' : 'Copy'}</span>
                        </button>

                        {/* Edit Button - Active for author or Team Lead; greyed out if unauthorized */}
                        <button
                          type="button"
                          onClick={() => canModify && onEdit(item)}
                          disabled={!canModify}
                          className={`w-full max-w-[62px] inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border transition-all ${
                            canModify
                              ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-fotoblue-50 dark:hover:bg-fotoblue-950/40 hover:text-fotoblue-700 dark:hover:text-fotoblue-300 hover:border-fotoblue-300 dark:hover:border-fotoblue-800 shadow-2xs active:scale-95 cursor-pointer'
                              : 'bg-slate-50 dark:bg-slate-800/20 text-slate-400 dark:text-slate-600 border-slate-200/50 dark:border-slate-800 opacity-40 cursor-not-allowed select-none'
                          }`}
                          title={
                            canModify
                              ? 'Edit interaction'
                              : `Edit locked: Only ${agentLabel} or a Team Lead can edit this log.`
                          }
                          aria-label={canModify ? 'Edit interaction' : 'Edit locked'}
                        >
                          <Edit2 className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400 shrink-0" />
                          <span>Edit</span>
                        </button>

                        {/* Delete Button - Active for author or Team Lead; greyed out if unauthorized */}
                        <button
                          type="button"
                          onClick={() => canModify && onDelete(item)}
                          disabled={!canModify}
                          className={`w-full max-w-[62px] inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border transition-all ${
                            canModify
                              ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-300 dark:hover:border-rose-800 shadow-2xs active:scale-95 cursor-pointer'
                              : 'bg-slate-50 dark:bg-slate-800/20 text-slate-400 dark:text-slate-600 border-slate-200/50 dark:border-slate-800 opacity-40 cursor-not-allowed select-none'
                          }`}
                          title={
                            canModify
                              ? 'Delete interaction'
                              : `Delete locked: Only ${agentLabel} or a Team Lead can delete this log.`
                          }
                          aria-label={canModify ? 'Delete interaction' : 'Delete locked'}
                        >
                          <Trash2 className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400 shrink-0" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Pagination & Scroll to Top */}
      <div
        ref={paginationRef}
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
            onClick={handleScrollToTop}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-fotoblue-700 dark:hover:text-fotoblue-400 bg-white dark:bg-slate-800 hover:bg-fotoblue-50/50 dark:hover:bg-slate-700 active:scale-98 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer group whitespace-nowrap"
            title="Smooth scroll back to top of the page"
            aria-label="Smooth scroll back to top"
          >
            <span>Back to Top</span>
            <ArrowUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-fotoblue-600 dark:group-hover:text-fotoblue-400 transition-transform group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
});
