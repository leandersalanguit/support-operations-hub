/**
 * @file InteractionTableFilterBar.tsx
 * @description Header filter and search controls for the InteractionTable component.
 * Provides search query filtering, date mode selection (All, Today, Custom), communication channel,
 * status dropdown, product filter, quick toggles, clear filters, and external link actions.
 */

import React from 'react';
import {
  Search,
  X,
  ArrowDown,
  ArrowUp,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { STATUS_OPTIONS } from '../../types';

export interface InteractionTableFilterBarProps {
  /** Search term across client, agent, product, ticket, and notes */
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  /** Date filter mode ('ALL' | 'TODAY' | 'CUSTOM') */
  dateFilter: 'ALL' | 'TODAY' | 'CUSTOM';
  onDateFilterChange: (filter: 'ALL' | 'TODAY' | 'CUSTOM') => void;
  /** Custom date string value (YYYY-MM-DD) when dateFilter is 'CUSTOM' */
  customDate: string;
  onCustomDateChange: (date: string) => void;
  /** Selected communication channel filter */
  selectedChannel: string;
  onChannelChange: (channel: string) => void;
  /** Selected status filter */
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  /** Date sorting direction */
  dateSortOrder: 'desc' | 'asc';
  onToggleDateSort: () => void;
  /** Toggle for in-event interactions only */
  inEventOnly: boolean;
  onToggleInEventOnly: () => void;
  /** Selected product filter */
  selectedProduct: string;
  onProductChange: (product: string) => void;
  /** Available products list for filtering */
  availableProducts: string[];
  /** Whether any active filters are applied */
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
  /** Action handler to smoothly scroll to pagination controls */
  onScrollToBottom: () => void;
  /** Optional Google Sheets URL */
  googleSheetsUrl?: string;
}

export const InteractionTableFilterBar: React.FC<InteractionTableFilterBarProps> = React.memo(({
  searchTerm,
  onSearchTermChange,
  dateFilter,
  onDateFilterChange,
  customDate,
  onCustomDateChange,
  selectedChannel,
  onChannelChange,
  selectedStatus,
  onStatusChange,
  dateSortOrder,
  onToggleDateSort,
  inEventOnly,
  onToggleInEventOnly,
  selectedProduct,
  onProductChange,
  availableProducts,
  hasActiveFilters,
  onClearAllFilters,
  onScrollToBottom,
  googleSheetsUrl,
}) => {
  return (
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
            onClick={onScrollToBottom}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-fotoblue-700 dark:hover:text-fotoblue-400 bg-slate-100/90 dark:bg-slate-800 hover:bg-fotoblue-50 dark:hover:bg-slate-700/80 active:scale-98 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer group whitespace-nowrap"
            title="Scroll to bottom to view pagination controls"
            aria-label="Scroll to bottom to view pagination controls"
          >
            <span>Scroll to Bottom</span>
            <ArrowDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-fotoblue-600 dark:group-hover:text-fotoblue-400 transition-transform group-hover:translate-y-0.5" />
          </button>

          {googleSheetsUrl && (
            <a
              href={googleSheetsUrl}
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
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchTermChange('')}
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
            onChange={(e) => onDateFilterChange(e.target.value as 'ALL' | 'TODAY' | 'CUSTOM')}
            className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-fotoblue-500 focus:outline-none cursor-pointer transition-all shadow-2xs"
          >
            <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">All Dates</option>
            <option value="TODAY" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Today Only</option>
            <option value="CUSTOM" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Custom Date</option>
          </select>
          {dateFilter === 'CUSTOM' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => onCustomDateChange(e.target.value)}
              className="px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
            />
          )}
        </div>

        {/* Channel Filter */}
        <div className="sm:col-span-1 lg:col-span-2">
          <select
            value={selectedChannel}
            onChange={(e) => onChannelChange(e.target.value)}
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
            onChange={(e) => onStatusChange(e.target.value)}
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
            onClick={onToggleDateSort}
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
            onClick={onToggleInEventOnly}
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
            onChange={(e) => onProductChange(e.target.value)}
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
            type="button"
            onClick={onClearAllFilters}
            className="flex items-center gap-1 text-xs text-fotoblue-600 dark:text-fotoblue-400 hover:text-fotoblue-800 dark:hover:text-fotoblue-300 font-bold cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
});
