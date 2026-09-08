/**
 * @file QuickStartGuidesDirectory.tsx
 * @description Quick Start Guides directory component for technical support operations.
 * Displays 5-minute setup guides, pre-event checklists, calibration cards, and emergency recovery flowcharts.
 */

import React from 'react';
import { BookOpen, ExternalLink, Copy, Check, Clock, CheckSquare, Calendar, Zap, Award } from 'lucide-react';
import { ResourceDirectory } from './common/ResourceDirectory';
import {
  QuickStartGuideItem,
  QUICK_START_CATEGORIES,
  QUICK_START_GUIDES,
  DifficultyLevel,
} from '../data/quickStartGuides';

interface QuickStartGuidesDirectoryProps {
  guides?: QuickStartGuideItem[];
  onNavigateToSummary: () => void;
}

function getDifficultyBadge(difficulty: DifficultyLevel) {
  switch (difficulty) {
    case 'Beginner':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Beginner
        </span>
      );
    case 'Intermediate':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-fotoblue-50 dark:bg-fotoblue-950/70 text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200 dark:border-fotoblue-800">
          <Award className="w-3 h-3 text-fotoblue-600 dark:text-fotoblue-400" />
          Intermediate
        </span>
      );
    case 'Advanced':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <Award className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          Advanced
        </span>
      );
  }
}

export const QuickStartGuidesDirectory: React.FC<QuickStartGuidesDirectoryProps> = ({
  guides,
  onNavigateToSummary,
}) => {
  const items = guides && guides.length > 0 ? guides : QUICK_START_GUIDES;

  return (
    <ResourceDirectory<QuickStartGuideItem>
      title="Quick Start Guides"
      categoryLabel="Product Links"
      icon={BookOpen}
      items={items}
      categories={QUICK_START_CATEGORIES}
      searchPlaceholder="Search setup guides, checklists, emergency triage, equipment..."
      countLabel="Guides"
      onNavigateToSummary={onNavigateToSummary}
      customSearchFields={['estimatedTime', 'difficulty', 'lastUpdated']}
      renderCard={(item, copyLink, isCopied) => (
        <div
          key={item.id}
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/85 dark:border-slate-800 hover:border-fotoblue-300 dark:hover:border-fotoblue-700 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between group"
        >
          <div>
            {/* Top Row: Icon + Difficulty + Category */}
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 group-hover:bg-fotoblue-100 dark:group-hover:bg-fotoblue-900/60 border border-fotoblue-100 dark:border-fotoblue-900 flex items-center justify-center text-fotoblue-600 dark:text-fotoblue-400 transition-colors shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>

              <div className="flex flex-wrap gap-1.5 justify-end items-center">
                {getDifficultyBadge(item.difficulty)}
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

            {/* Meta Attributes: Time, Steps, Date */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
              {item.estimatedTime && (
                <div className="inline-flex items-center gap-1 font-semibold text-fotoblue-600 dark:text-fotoblue-400">
                  <Clock className="w-3 h-3" />
                  <span>{item.estimatedTime}</span>
                </div>
              )}
              {item.stepsCount && (
                <div className="inline-flex items-center gap-1">
                  <CheckSquare className="w-3 h-3 text-slate-400" />
                  <span>{item.stepsCount} steps</span>
                </div>
              )}
              {item.lastUpdated && (
                <div className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{item.lastUpdated}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3 line-clamp-2">
                {item.description}
              </p>
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
              href={item.guideUrl || item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 hover:bg-fotoblue-600 hover:text-white text-fotoblue-700 dark:text-fotoblue-300 text-xs font-bold transition-all cursor-pointer group/btn"
            >
              <span>Open Guide</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </a>

            <button
              onClick={() => copyLink(item.guideUrl || item.url, item.id)}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Copy guide link"
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
