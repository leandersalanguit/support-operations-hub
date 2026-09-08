/**
 * @file MarketingFolders.tsx
 * @description Streamlined Marketing Folders directory component for the Support Team.
 * Clean, fast, and clutter-free list/grid of product marketing folders with direct Google Drive links.
 */

import React, { useState, useMemo } from 'react';
import {
  FolderOpen,
  Search,
  ExternalLink,
  Copy,
  Check,
  ArrowLeft,
  Filter,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  MARKETING_FOLDERS,
  MARKETING_CATEGORIES,
  MarketingCategory,
  MarketingFolderItem,
} from '../data/marketingFolders';
import { extractUniqueCategories } from '../data/resourceUtils';
import { MarketingResource } from '../infrastructure/supabase/configRepo';
import { useClipboardCopy } from '../utils/clipboard';


interface MarketingFoldersProps {
  resources?: MarketingResource[];
  onNavigateToSummary: () => void;
}

export const MarketingFolders: React.FC<MarketingFoldersProps> = ({ resources, onNavigateToSummary }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('resource_directory_view_mode') as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('resource_directory_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const { isCopied, copy: copyLink } = useClipboardCopy(2000);

  /**
   * Handle copy link to clipboard with feedback timeout.
   */
  const handleCopyLink = (item: MarketingFolderItem) => {
    copyLink(item.driveUrl, item.id);
  };

  // Map dynamic resources if provided, otherwise fallback to local static data
  const folderItems: MarketingFolderItem[] = useMemo(() => {
    if (resources && resources.length > 0) {
      return resources.map((r: any) => ({
        id: r.id,
        name: r.name || r.title || 'Resource',
        driveUrl: r.url || r.driveUrl || '#',
        categories: (Array.isArray(r.categories) ? r.categories : (r.category ? [r.category] : ['General'])) as MarketingCategory[],
        description: r.description || '',
      }));
    }
    return MARKETING_FOLDERS;
  }, [resources]);

  /**
   * Dynamically derive unique categories from the loaded items (Supabase or fallback).
   */
  const availableCategories = useMemo<string[]>(() => {
    return extractUniqueCategories(folderItems, MARKETING_CATEGORIES);
  }, [folderItems]);

  /**
   * Compute counts per category for the filter pills.
   */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: folderItems.length };
    availableCategories.forEach((cat) => {
      counts[cat] = folderItems.filter((item) => item.categories.includes(cat as any)).length;
    });
    return counts;
  }, [folderItems, availableCategories]);


  /**
   * Filter items based on search query and active category filter.
   */
  const filteredFolders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return folderItems.filter((item) => {
      // Category filter
      const matchesCategory =
        selectedCategory === 'All' || (item.categories as string[]).includes(selectedCategory);


      if (!matchesCategory) return false;

      // Text search filter
      if (!query) return true;

      const nameMatch = item.name.toLowerCase().includes(query);
      const categoryMatch = item.categories.some((cat) => cat.toLowerCase().includes(query));

      return nameMatch || categoryMatch;
    });
  }, [folderItems, searchQuery, selectedCategory]);

  return (
    <div className="space-y-5 animate-fadeIn pb-10">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">
            <button
              onClick={onNavigateToSummary}
              className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Shift Hub
            </button>
            <span>/</span>
            <span className="text-fotoblue-600 dark:text-fotoblue-400 font-bold">Marketing Folders</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Marketing Folders
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200 dark:border-fotoblue-800">
            <FolderOpen className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
            {folderItems.length} Folders
          </span>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resource folders..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-fotoblue-400 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 mr-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <Filter className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            <span>Filter:</span>
          </div>

          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'All'
                ? 'bg-fotoblue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedCategory === 'All' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {categoryCounts['All']}
            </span>
          </button>

          {availableCategories.map((category) => {
            const count = categoryCounts[category] || 0;
            const isSelected = selectedCategory === category;


            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-fotoblue-600 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
                }`}
              >
                <span>{category}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header Count & View Mode Switcher */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2.5">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Showing <span className="text-slate-800 dark:text-slate-200 font-bold">{filteredFolders.length}</span> of{' '}
          <span className="text-slate-800 dark:text-slate-200 font-bold">{folderItems.length}</span> folders
          {selectedCategory !== 'All' && (
            <span>
              {' '}
              in <strong className="text-fotoblue-600 dark:text-fotoblue-400">{selectedCategory}</strong>
            </span>
          )}
          {searchQuery && (
            <span>
              {' '}
              matching &quot;<strong>{searchQuery}</strong>&quot;
            </span>
          )}
        </p>

        <div className="flex items-center gap-2">
          {(selectedCategory !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-fotoblue-600 dark:text-fotoblue-400 hover:text-fotoblue-800 dark:hover:text-fotoblue-300 transition-colors cursor-pointer mr-1"
            >
              Reset Filters
            </button>
          )}

          {/* View Mode Toggle: Grid vs List */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-fotoblue-600 dark:text-fotoblue-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Grid</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-fotoblue-600 dark:text-fotoblue-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid or List of Clean Folder Items */}
      {filteredFolders.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredFolders.map((item) => {
              const isItemCopied = isCopied(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/85 dark:border-slate-800 hover:border-fotoblue-300 dark:hover:border-fotoblue-700 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Folder Icon + Category Tags */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="w-8 h-8 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 group-hover:bg-fotoblue-100 dark:group-hover:bg-fotoblue-900/60 border border-fotoblue-100 dark:border-fotoblue-900 flex items-center justify-center text-fotoblue-600 dark:text-fotoblue-400 transition-colors shrink-0">
                        <FolderOpen className="w-4 h-4" />
                      </div>

                      <div className="flex flex-wrap gap-1 justify-end">
                        {item.categories.map((cat) => (
                          <span
                            key={cat}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Product Title Only (No clutter or descriptions) */}
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-fotoblue-700 dark:group-hover:text-fotoblue-400 transition-colors tracking-tight">
                      {item.name}
                    </h3>
                  </div>

                  {/* Actions: Open Drive & Copy Link */}
                  <div className="pt-3.5 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <a
                      href={item.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 hover:bg-fotoblue-600 hover:text-white text-fotoblue-700 dark:text-fotoblue-300 text-xs font-bold transition-all cursor-pointer group/btn"
                    >
                      <span>Open Drive</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </a>

                    <button
                      onClick={() => handleCopyLink(item)}
                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isItemCopied
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                      title="Copy Google Drive link"
                    >
                      {isItemCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[11px]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col space-y-2.5 sm:space-y-3">
            {filteredFolders.map((item) => {
              const isItemCopied = isCopied(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 border border-slate-200/85 dark:border-slate-800 hover:border-fotoblue-300 dark:hover:border-fotoblue-700 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 group-hover:bg-fotoblue-100 dark:group-hover:bg-fotoblue-900/60 border border-fotoblue-100 dark:border-fotoblue-900 flex items-center justify-center text-fotoblue-600 dark:text-fotoblue-400 transition-colors shrink-0 mt-0.5">
                      <FolderOpen className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-fotoblue-700 dark:group-hover:text-fotoblue-400 transition-colors">
                          {item.name}
                        </h3>
                        {item.categories.map((cat) => (
                          <span
                            key={cat}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 w-full sm:w-auto">
                    <a
                      href={item.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 hover:bg-fotoblue-600 hover:text-white text-fotoblue-700 dark:text-fotoblue-300 text-xs font-bold transition-all cursor-pointer group/btn"
                    >
                      <span>Open Drive</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </a>

                    <button
                      onClick={() => handleCopyLink(item)}
                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isItemCopied
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                      title="Copy Google Drive link"
                    >
                      {isItemCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[11px]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No folders matching &quot;{searchQuery}&quot; in the selected category.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
