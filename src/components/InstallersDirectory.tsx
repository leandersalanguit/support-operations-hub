/**
 * @file InstallersDirectory.tsx
 * @description Product Installers directory component for technical support operations.
 * Displays official software suites, camera SDK drivers, printer spoolers, and recovery tools.
 */

import React from 'react';
import { Download, ExternalLink, Copy, Check, HardDrive, Monitor, Calendar } from 'lucide-react';
import { ResourceDirectory } from './common/ResourceDirectory';
import { ExpandableDescription } from './common/ExpandableDescription';
import { InstallerItem, INSTALLER_CATEGORIES, INSTALLERS } from '../data/installers';

interface InstallersDirectoryProps {
  installers?: InstallerItem[];
  onNavigateToSummary: () => void;
}

export const InstallersDirectory: React.FC<InstallersDirectoryProps> = ({
  installers,
  onNavigateToSummary,
}) => {
  const items = installers && installers.length > 0 ? installers : INSTALLERS;

  return (
    <ResourceDirectory<InstallerItem>
      title="Product Installers"
      categoryLabel="Product Links"
      icon={Download}
      items={items}
      categories={INSTALLER_CATEGORIES}
      searchPlaceholder="Search software, drivers, version, equipment..."
      countLabel="Installers"
      onNavigateToSummary={onNavigateToSummary}
      customSearchFields={['version', 'operatingSystem', 'releaseDate', 'fileSize']}
      renderCard={(item, copyLink, isCopied) => (
        <div
          key={item.id}
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/85 dark:border-slate-800 hover:border-fotoblue-300 dark:hover:border-fotoblue-700 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between group"
        >
          <div>
            {/* Top Row: Icon + Version + Category Pill */}
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 group-hover:bg-fotoblue-100 dark:group-hover:bg-fotoblue-900/60 border border-fotoblue-100 dark:border-fotoblue-900 flex items-center justify-center text-fotoblue-600 dark:text-fotoblue-400 transition-colors shrink-0">
                <Download className="w-4 h-4" />
              </div>

              <div className="flex flex-wrap gap-1.5 justify-end items-center">
                {item.version && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-fotoblue-50 dark:bg-fotoblue-950/80 text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200 dark:border-fotoblue-800">
                    {item.version}
                  </span>
                )}
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

            {/* Title */}
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-fotoblue-700 dark:group-hover:text-fotoblue-400 transition-colors tracking-tight mb-2">
              {item.name}
            </h3>

            {/* Meta Attributes: OS, Size, Date */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
              {item.operatingSystem && (
                <div className="inline-flex items-center gap-1">
                  <Monitor className="w-3 h-3 text-slate-400" />
                  <span>{item.operatingSystem}</span>
                </div>
              )}
              {item.fileSize && (
                <div className="inline-flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-slate-400" />
                  <span>{item.fileSize}</span>
                </div>
              )}
              {item.releaseDate && (
                <div className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{item.releaseDate}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <ExpandableDescription text={item.description} />

            {/* Compatible Equipment Tags */}
            {item.compatibleProducts && item.compatibleProducts.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {item.compatibleProducts.map((product) => (
                  <span
                    key={product}
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/60"
                  >
                    {product}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons: Direct Download + Copy Link */}
          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <a
              href={item.downloadUrl || item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 hover:bg-fotoblue-600 hover:text-white text-fotoblue-700 dark:text-fotoblue-300 text-xs font-bold transition-all cursor-pointer group/btn"
            >
              <span>Download</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </a>

            <button
              onClick={() => copyLink(item.downloadUrl || item.url, item.id)}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Copy download link"
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
          className="bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 border border-slate-200/85 dark:border-slate-800 hover:border-fotoblue-300 dark:hover:border-fotoblue-700 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3.5 group"
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 group-hover:bg-fotoblue-100 dark:group-hover:bg-fotoblue-900/60 border border-fotoblue-100 dark:border-fotoblue-900 flex items-center justify-center text-fotoblue-600 dark:text-fotoblue-400 transition-colors shrink-0 mt-0.5">
              <Download className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              {/* Title + Version + Categories */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-fotoblue-700 dark:group-hover:text-fotoblue-400 transition-colors">
                  {item.name}
                </h3>
                {item.version && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-fotoblue-50 dark:bg-fotoblue-950/80 text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200 dark:border-fotoblue-800">
                    {item.version}
                  </span>
                )}
                {item.categories.map((cat) => (
                  <span
                    key={cat}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              {/* Meta info: OS, Size, Date */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                {item.operatingSystem && (
                  <div className="inline-flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-slate-400" />
                    <span>{item.operatingSystem}</span>
                  </div>
                )}
                {item.fileSize && (
                  <div className="inline-flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-slate-400" />
                    <span>{item.fileSize}</span>
                  </div>
                )}
                {item.releaseDate && (
                  <div className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{item.releaseDate}</span>
                  </div>
                )}
              </div>

              {/* Expandable Description */}
              {item.description && (
                <ExpandableDescription text={item.description} className="mb-1.5" />
              )}

              {/* Compatible Equipment Tags */}
              {item.compatibleProducts && item.compatibleProducts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.compatibleProducts.map((product) => (
                    <span
                      key={product}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/60"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 w-full md:w-auto">
            <a
              href={item.downloadUrl || item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 hover:bg-fotoblue-600 hover:text-white text-fotoblue-700 dark:text-fotoblue-300 text-xs font-bold transition-all cursor-pointer group/btn"
            >
              <span>Download</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </a>

            <button
              onClick={() => copyLink(item.downloadUrl || item.url, item.id)}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Copy download link"
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
