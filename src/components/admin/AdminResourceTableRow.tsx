/**
 * @file AdminResourceTableRow.tsx
 * @description Accessible, modular table row component for administrative resource catalogs.
 * Renders resource item attributes, sanitized links, metadata badges, and accessible action buttons.
 */

import React from 'react';
import { ExternalLink, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { AdminResourceConfig } from '../../utils/adminResourceConfig';
import { sanitizeExternalUrl } from '../../utils/adminFormValidation';

export interface AdminResourceTableRowProps {
  item: any;
  config: AdminResourceConfig;
  onToggleStatus: (item: any) => void;
  onRename: (item: any) => void;
}

export const AdminResourceTableRow: React.FC<AdminResourceTableRowProps> = ({
  item,
  config,
  onToggleStatus,
  onRename,
}) => {
  const categories = Array.isArray(item.categories)
    ? item.categories
    : item.category
    ? [item.category]
    : [];

  const safeUrl = sanitizeExternalUrl(item.url);
  const hasValidUrl = safeUrl !== '#';

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
      {/* Name / Title */}
      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
        <div className="flex items-center gap-2">
          <span>{item.name}</span>
          {item.version && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-fotoblue-50 dark:bg-fotoblue-950/80 text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200 dark:border-fotoblue-800">
              {item.version}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate max-w-sm mt-0.5">
            {item.description}
          </p>
        )}
      </td>

      {/* Link (if applicable) */}
      {config.tableName !== 'case_classifications' && (
        <td className="py-3.5 px-4">
          {hasValidUrl ? (
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
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      )}

      {/* Category / Tags */}
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

      {/* Details / Metadata */}
      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
        {item.operating_system && <div>OS: {item.operating_system}</div>}
        {item.file_size && <div>Size: {item.file_size}</div>}
        {item.format && <div>Format: {item.format}</div>}
        {item.difficulty && <div>Difficulty: {item.difficulty}</div>}
        {item.estimated_time && <div>Est: {item.estimated_time}</div>}
        {item.status && <div>Status: {item.status}</div>}
        {item.model_number && <div>Model: {item.model_number}</div>}
        {item.estimated_price && <div>Price: {item.estimated_price}</div>}
        {!item.operating_system &&
          !item.file_size &&
          !item.format &&
          !item.difficulty &&
          !item.status &&
          !item.model_number && (
            <span className="text-slate-400">—</span>
          )}
      </td>

      {/* Status */}
      <td className="py-3.5 px-4 text-center whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            item.is_active
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.is_active ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onRename(item)}
            aria-label={`Rename "${item.name}"`}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title={`Rename "${item.name}"`}
          >
            <Edit2 className="w-3 h-3 text-fotoblue-600 dark:text-fotoblue-400" />
            <span className="hidden sm:inline">Rename</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleStatus(item)}
            aria-label={item.is_active ? `Deactivate "${item.name}"` : `Activate "${item.name}"`}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              item.is_active
                ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100'
            }`}
            title={item.is_active ? 'Deactivate entry' : 'Activate entry'}
          >
            {item.is_active ? (
              <ToggleRight className="w-4 h-4 text-emerald-600" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
};
