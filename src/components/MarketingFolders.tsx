/**
 * @file MarketingFolders.tsx
 * @description Streamlined Marketing Folders directory component for the Support Team.
 * Reuses the canonical ResourceDirectory shell with custom Google Drive folder cards and list items.
 */

import React, { useMemo } from 'react';
import { FolderOpen, ExternalLink, Copy, Check } from 'lucide-react';
import {
  MARKETING_FOLDERS,
  MARKETING_CATEGORIES,
  MarketingCategory,
  MarketingFolderItem,
} from '../data/marketingFolders';
import { MarketingResource } from '../infrastructure/supabase/configRepo';
import { ResourceDirectory } from './common/ResourceDirectory';
import { ExpandableDescription } from './common/ExpandableDescription';

export interface MarketingResourceItem extends MarketingFolderItem {
  url: string;
}

interface MarketingFoldersProps {
  resources?: MarketingResource[];
  onNavigateToSummary: () => void;
}

export const MarketingFolders: React.FC<MarketingFoldersProps> = ({ resources, onNavigateToSummary }) => {
  // Map dynamic resources if provided, otherwise fallback to local static data
  const folderItems: MarketingResourceItem[] = useMemo(() => {
    if (resources && resources.length > 0) {
      return resources.map((r: any) => ({
        id: r.id,
        name: r.name || r.title || 'Resource',
        driveUrl: r.url || r.driveUrl || '#',
        url: r.url || r.driveUrl || '#',
        categories: (Array.isArray(r.categories) ? r.categories : (r.category ? [r.category] : ['General'])) as MarketingCategory[],
        description: r.description || '',
      }));
    }
    return MARKETING_FOLDERS.map((m) => ({
      ...m,
      url: m.driveUrl || m.url || '#',
    }));
  }, [resources]);

  return (
    <ResourceDirectory<MarketingResourceItem>
      title="Marketing Folders"
      categoryLabel="Marketing Links"
      icon={FolderOpen}
      items={folderItems}
      categories={MARKETING_CATEGORIES}
      searchPlaceholder="Search product marketing folders, collateral, decks..."
      countLabel="Folders"
      onNavigateToSummary={onNavigateToSummary}
      renderCard={(item, copyLink, isCopied) => (
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

            {/* Product Title */}
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-fotoblue-700 dark:group-hover:text-fotoblue-400 transition-colors tracking-tight mb-2">
              {item.name}
            </h3>

            {/* Description */}
            {item.description && <ExpandableDescription text={item.description} />}
          </div>

          {/* Actions: Open Drive & Copy Link */}
          <div className="pt-3.5 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <a
              href={item.driveUrl || item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 hover:bg-fotoblue-600 hover:text-white text-fotoblue-700 dark:text-fotoblue-300 text-xs font-bold transition-all cursor-pointer group/btn"
            >
              <span>Open Drive</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </a>

            <button
              onClick={() => copyLink(item.driveUrl || item.url, item.id)}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Copy Google Drive link"
            >
              {isCopied ? (
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
      )}
      renderListItem={(item, copyLink, isCopied) => (
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
              {item.description && <ExpandableDescription text={item.description} className="mb-0" />}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 w-full sm:w-auto">
            <a
              href={item.driveUrl || item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 hover:bg-fotoblue-600 hover:text-white text-fotoblue-700 dark:text-fotoblue-300 text-xs font-bold transition-all cursor-pointer group/btn"
            >
              <span>Open Drive</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </a>

            <button
              onClick={() => copyLink(item.driveUrl || item.url, item.id)}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Copy Google Drive link"
            >
              {isCopied ? (
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
      )}
    />
  );
};
