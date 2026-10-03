/**
 * @file AdminResourceTableRow.tsx
 * @description Accessible, modular table row component for administrative resource catalogs.
 * Renders resource item attributes, sanitized links, metadata badges, and accessible action buttons.
 */

import React, { useState } from 'react';
import { ExternalLink, Edit2, Copy, Check } from 'lucide-react';
import { AdminResourceConfig } from '../../utils/adminResourceConfig';
import { sanitizeExternalUrl } from '../../utils/adminFormValidation';

export interface AdminResourceTableRowProps {
  item: any;
  config: AdminResourceConfig;
  onToggleStatus: (item: any) => void;
  onEdit: (item: any) => void;
}

export const AdminResourceTableRow: React.FC<AdminResourceTableRowProps> = ({
  item,
  config,
  onToggleStatus,
  onEdit,
}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const categories = Array.isArray(item.categories)
    ? item.categories
    : item.category
    ? [item.category]
    : [];

  const safeUrl = sanitizeExternalUrl(item.url);
  const hasValidUrl = safeUrl !== '#';

  const handleCopyLink = async () => {
    if (!item.url) return;
    try {
      await navigator.clipboard.writeText(item.url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const isCaseClassification = config.key === 'admin-case-classifications';
  const showDetails = config.hasDetailsColumn !== false;
  const showTags = config.hasTagsColumn !== false;

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
      {/* Name / Title / Classification */}
      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
        <div className="flex items-center gap-2">
          <span>{item.name}</span>
          {!isCaseClassification && item.version && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-fotoblue-50 dark:bg-fotoblue-950/80 text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200 dark:border-fotoblue-800">
              {item.version}
            </span>
          )}
        </div>
        {!isCaseClassification && item.description && (
          <p className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate max-w-sm mt-0.5">
            {item.description}
          </p>
        )}
      </td>

      {/* Link (if applicable) */}
      {!isCaseClassification && (
        <td className="py-3.5 px-4">
          {hasValidUrl ? (
            <div className="flex flex-col gap-1 items-start">
              <a
                href={safeUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-fotoblue-600 dark:text-fotoblue-400 hover:underline max-w-[200px] truncate"
                title={item.url}
                aria-label={`Open external link for ${item.name}`}
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Open Link</span>
              </a>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label={`Copy link for ${item.name}`}
                title="Copy link to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 shrink-0" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      )}

      {/* Category / Tags */}
      {showTags && (
        <td className="py-3.5 px-4">
          <div className="flex flex-wrap gap-1 max-w-xs">
            {categories.length > 0 ? (
              categories.map((cat: string) => (
                <span
                  key={cat}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {cat}
                </span>
              ))
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
        </td>
      )}

      {/* Details / Metadata (Installers & Quick Start Guides only) */}
      {showDetails && (
        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
          {item.operating_system && <div>OS: {item.operating_system}</div>}
          {item.file_size && <div>Size: {item.file_size}</div>}
          {item.difficulty && <div>Difficulty: {item.difficulty}</div>}
          {item.estimated_time && <div>Est: {item.estimated_time}</div>}
          {!item.operating_system &&
            !item.file_size &&
            !item.difficulty &&
            !item.estimated_time && (
              <span className="text-slate-400">—</span>
            )}
        </td>
      )}

      {/* Status (Actual accessible slider toggle switch) */}
      <td className="py-3.5 px-4 text-center whitespace-nowrap">
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={item.is_active}
            onClick={() => onToggleStatus(item)}
            title={item.is_active ? `Deactivate "${item.name}"` : `Activate "${item.name}"`}
            aria-label={item.is_active ? `Deactivate "${item.name}"` : `Activate "${item.name}"`}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500/30 ${
              item.is_active ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                item.is_active ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              item.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {item.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(item)}
            aria-label={`Edit entry "${item.name}"`}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title={`Edit entry "${item.name}"`}
          >
            <Edit2 className="w-3 h-3 text-fotoblue-600 dark:text-fotoblue-400" />
            <span>Edit Entry</span>
          </button>
        </div>
      </td>
    </tr>
  );
};
