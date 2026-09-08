/**
 * @file WorkInProgress.tsx
 * @description Work In Progress placeholder component for tabs currently under development
 * (such as Product Links: Installers, Marketing Folders, Quick Start Guides, Recommended Hardware, Manuals, Renewal Links).
 */

import React from 'react';
import {
  Construction,
  Download,
  FolderOpen,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  Clock,
  BookOpen,
  Cpu,
  FileText,
  HelpCircle,
  Video,
  Cloud,
  ArrowUpCircle,
  Layers,
} from 'lucide-react';

export type TabKey =
  | 'shift-summary'
  | 'client-directory'
  | 'product-links'
  | 'installer'
  | 'quick-start-guide'
  | 'recommended-hardware'
  | 'manuals'
  | 'marketing-folders'
  | 'renewal-links'
  | 'faq'
  | 'production-videos'
  | 'cloud-orders'
  | 'software-upgrades'
  | 'components-info';

interface WorkInProgressProps {
  activeTab: TabKey;
  onNavigateToSummary: () => void;
}

interface TabMeta {
  title: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  plannedBadge: string;
  externalUrl?: string;
  isEmpty?: boolean;
}

const TAB_METADATA: Record<Exclude<TabKey, 'shift-summary' | 'client-directory'>, TabMeta> = {
  'product-links': {
    title: 'Product Links Hub',
    category: 'Product Links',
    description:
      'Centralized directory for all equipment resources, installers, quick start guides, recommended hardware, and manuals.',
    icon: ExternalLink,
    plannedBadge: 'Coming Soon',
  },
  installer: {
    title: 'Product Installers',
    category: 'Product Links',
    description:
      'Official repository and quick links to download current and legacy software installers and patches.',
    icon: Download,
    plannedBadge: 'In Development',
  },
  'quick-start-guide': {
    title: 'Quick Start Guides',
    category: 'Product Links',
    description:
      'Step-by-step setup guides, initial configuration walkthroughs, and operator checklists for supported equipment.',
    icon: BookOpen,
    plannedBadge: 'In Development',
  },
  'recommended-hardware': {
    title: 'Recommended Hardware',
    category: 'Product Links',
    description:
      'Verified PC specifications, approved cameras, flash strobes, printer models, and compatible accessories.',
    icon: Cpu,
    plannedBadge: 'In Development',
  },
  manuals: {
    title: 'Product Manuals',
    category: 'Product Links',
    description:
      'Comprehensive product manuals, hardware wiring diagrams, and technical operational documentation.',
    icon: FileText,
    plannedBadge: 'In Development',
  },
  'marketing-folders': {
    title: 'Marketing Folders',
    category: 'Product Links',
    description:
      'Curated Google Drive and cloud storage folders with promotional media, product photos, and customer-facing assets.',
    icon: FolderOpen,
    plannedBadge: 'In Development',
  },
  'renewal-links': {
    title: 'Renewal Links',
    category: 'Renewal Links',
    description:
      'Direct portals and tools for processing support renewals, software subscriptions, and hardware warranty extensions.',
    icon: RefreshCw,
    plannedBadge: 'In Development',
  },
  faq: {
    title: 'FAQ',
    category: 'Monday Boards',
    description:
      'Frequently asked questions, troubleshooting runbooks, and support guidelines on Monday.com.',
    icon: HelpCircle,
    plannedBadge: 'In Development',
  },
  'production-videos': {
    title: 'Production Videos',
    category: 'Monday Boards',
    description:
      'Video production requests, tutorial recordings, and media development pipeline on Monday.com.',
    icon: Video,
    plannedBadge: 'In Development',
  },
  'cloud-orders': {
    title: 'Cloud Orders',
    category: 'Monday Boards',
    description:
      'Cloud subscription orders, license generation requests, and server provisioning board on Monday.com.',
    icon: Cloud,
    plannedBadge: 'In Development',
  },
  'software-upgrades': {
    title: 'Software Upgrades',
    category: 'Monday Boards',
    description:
      'Customer software upgrade requests, license transfers, and version migrations on Monday.com.',
    icon: ArrowUpCircle,
    plannedBadge: 'In Development',
  },
  'components-info': {
    title: 'Components Info',
    category: 'Monday Boards',
    description:
      'Hardware components inventory, parts compatibility, and manufacturer specifications on Monday.com.',
    icon: Layers,
    plannedBadge: 'In Development',
  },
};

export const WorkInProgress: React.FC<WorkInProgressProps> = ({
  activeTab,
  onNavigateToSummary,
}) => {
  const meta =
    activeTab === 'shift-summary' || activeTab === 'client-directory'
      ? TAB_METADATA['product-links']
      : (TAB_METADATA as any)[activeTab] || TAB_METADATA['product-links'];

  const IconComponent = meta.icon;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -right-12 -top-12 w-56 h-56 bg-fotoblue-50 dark:bg-fotoblue-900/10 rounded-full blur-3xl opacity-70 pointer-events-none" />
        <div className="absolute -right-4 -bottom-4 w-40 h-40 bg-fototeal-50 dark:bg-fototeal-900/10 rounded-full blur-2xl opacity-60 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            {/* Breadcrumb & status */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
              <span>{meta.category}</span>
              <span>/</span>
              <span className="text-fotoblue-600 dark:text-fotoblue-400 font-bold">{meta.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {meta.plannedBadge}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Work In Progress
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fotoblue-500 to-fotodeep-600 flex items-center justify-center text-white shadow-md shadow-fotoblue-500/20 shrink-0">
              <IconComponent className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {meta.title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main WIP Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-12 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center relative overflow-hidden">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="inline-flex p-4 rounded-3xl bg-fotoblue-50 dark:bg-fotoblue-950/60 border border-fotoblue-100 dark:border-fotoblue-900 text-fotoblue-600 dark:text-fotoblue-400 mb-2 shadow-inner">
            <Construction className="w-12 h-12 text-fotoblue-600 dark:text-fotoblue-400 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
              This section is currently under construction
            </h2>
          </div>

          {/* Action button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onNavigateToSummary}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-fotoblue-600 hover:bg-fotoblue-700 text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Shift Summary
            </button>
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Internal Support Operations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
