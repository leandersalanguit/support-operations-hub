/**
 * @file RecommendedHardwareDirectory.tsx
 * @description Recommended & certified hardware directory component for technical support operations.
 * Displays approved cameras, dye-sub printers, mini PCs, flash strobes, touch monitors, and accessories.
 */

import React from 'react';
import { Cpu, ExternalLink, Copy, Check, Tag, Info, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ResourceDirectory } from './common/ResourceDirectory';
import {
  RecommendedHardwareItem,
  HARDWARE_CATEGORIES,
  RECOMMENDED_HARDWARE,
  HardwareStatus,
} from '../data/recommendedHardware';

interface RecommendedHardwareDirectoryProps {
  hardware?: RecommendedHardwareItem[];
  onNavigateToSummary: () => void;
}

function getStatusBadge(status: HardwareStatus) {
  switch (status) {
    case 'Recommended':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Recommended
        </span>
      );
    case 'Certified Compatible':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-fotoblue-50 dark:bg-fotoblue-950/70 text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200 dark:border-fotoblue-800">
          <ShieldCheck className="w-3 h-3 text-fotoblue-600 dark:text-fotoblue-400" />
          Certified
        </span>
      );
    case 'Legacy Supported':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          Legacy
        </span>
      );
  }
}

export const RecommendedHardwareDirectory: React.FC<RecommendedHardwareDirectoryProps> = ({
  hardware,
  onNavigateToSummary,
}) => {
  const items = hardware && hardware.length > 0 ? hardware : RECOMMENDED_HARDWARE;

  return (
    <ResourceDirectory<RecommendedHardwareItem>
      title="Recommended Hardware"
      categoryLabel="Product Links"
      icon={Cpu}
      items={items}
      categories={HARDWARE_CATEGORIES}
      searchPlaceholder="Search hardware, model number, specifications, equipment..."
      countLabel="Components"
      onNavigateToSummary={onNavigateToSummary}
      customSearchFields={['modelNumber', 'specifications', 'notes', 'estimatedPrice']}
      renderCard={(item, copyLink, isCopied) => (
        <div
          key={item.id}
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/85 dark:border-slate-800 hover:border-fotoblue-300 dark:hover:border-fotoblue-700 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between group"
        >
          <div>
            {/* Top Row: Icon + Status + Category */}
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 group-hover:bg-fotoblue-100 dark:group-hover:bg-fotoblue-900/60 border border-fotoblue-100 dark:border-fotoblue-900 flex items-center justify-center text-fotoblue-600 dark:text-fotoblue-400 transition-colors shrink-0">
                <Cpu className="w-4 h-4" />
              </div>

              <div className="flex flex-wrap gap-1.5 justify-end items-center">
                {getStatusBadge(item.status)}
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

            {/* Hardware Name */}
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-fotoblue-700 dark:group-hover:text-fotoblue-400 transition-colors tracking-tight mb-1.5">
              {item.name}
            </h3>

            {/* Model & Price Tags */}
            <div className="flex flex-wrap items-center gap-2 text-xs mb-2.5">
              {item.modelNumber && (
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  Model: {item.modelNumber}
                </span>
              )}
              {item.estimatedPrice && (
                <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  <Tag className="w-3 h-3" />
                  {item.estimatedPrice}
                </span>
              )}
            </div>

            {/* Specifications */}
            {item.specifications && (
              <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 mb-2.5 leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-200 font-semibold block mb-0.5">Key Specs:</strong>
                {item.specifications}
              </div>
            )}

            {/* Operator Notes / Tips */}
            {item.notes && (
              <div className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300/90 bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded-md border border-amber-200/60 dark:border-amber-900/40 mb-2.5">
                <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{item.notes}</span>
              </div>
            )}

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

          {/* Action Buttons */}
          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 hover:bg-fotoblue-600 hover:text-white text-fotoblue-700 dark:text-fotoblue-300 text-xs font-bold transition-all cursor-pointer group/btn"
            >
              <span>View Product</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </a>

            <button
              onClick={() => copyLink(item.url, item.id)}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Copy product link"
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
              <Cpu className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              {/* Title + Status + Categories */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-fotoblue-700 dark:group-hover:text-fotoblue-400 transition-colors">
                  {item.name}
                </h3>
                {getStatusBadge(item.status)}
                {item.categories.map((cat) => (
                  <span
                    key={cat}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              {/* Model & Price Tags */}
              <div className="flex flex-wrap items-center gap-2 text-xs mb-1.5">
                {item.modelNumber && (
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    Model: {item.modelNumber}
                  </span>
                )}
                {item.estimatedPrice && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    <Tag className="w-3 h-3" />
                    {item.estimatedPrice}
                  </span>
                )}
              </div>

              {/* Key Specs summary */}
              {item.specifications && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-1 leading-relaxed">
                  <strong className="text-slate-700 dark:text-slate-200 font-semibold">Specs: </strong>
                  {item.specifications}
                </p>
              )}

              {/* Operator notes if any */}
              {item.notes && (
                <div className="flex items-start gap-1 text-[11px] text-amber-800 dark:text-amber-300/90 bg-amber-50/60 dark:bg-amber-950/30 px-2 py-1 rounded border border-amber-200/60 dark:border-amber-900/40 mb-1.5">
                  <Info className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{item.notes}</span>
                </div>
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
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 hover:bg-fotoblue-600 hover:text-white text-fotoblue-700 dark:text-fotoblue-300 text-xs font-bold transition-all cursor-pointer group/btn"
            >
              <span>View Product</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </a>

            <button
              onClick={() => copyLink(item.url, item.id)}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Copy product link"
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
