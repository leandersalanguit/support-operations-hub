/**
 * @file AdminDashboard.tsx
 * @description Central administrative navigation shell for Team Leads. Coordinates sub-navigation
 * between the Product Catalog and the 6 support operational resources.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Package,
  ArrowLeft,
  Tags,
  Download,
  FolderOpen,
  BookOpen,
  Cpu,
  FileText,
} from 'lucide-react';
import { ADMIN_RESOURCE_CONFIGS, AdminResourceKey } from '../../utils/adminResourceConfig';
import { AdminResourceTableView } from './AdminResourceTableView';
import { AdminProductCatalogView } from './AdminProductCatalogView';

export type AdminTabKey =
  | 'admin-product-catalog'
  | 'admin-case-classifications'
  | 'admin-installers'
  | 'admin-marketing-folders'
  | 'admin-quick-start-guides'
  | 'admin-recommended-hardware'
  | 'admin-manuals';

interface AdminTabOption {
  key: AdminTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_TABS: AdminTabOption[] = [
  { key: 'admin-product-catalog', label: 'Product Catalog', icon: Package },
  { key: 'admin-case-classifications', label: 'Case Classifications', icon: Tags },
  { key: 'admin-installers', label: 'Installers', icon: Download },
  { key: 'admin-marketing-folders', label: 'Marketing Folders', icon: FolderOpen },
  { key: 'admin-quick-start-guides', label: 'Quick Start Guides', icon: BookOpen },
  { key: 'admin-recommended-hardware', label: 'Recommended Hardware', icon: Cpu },
  { key: 'admin-manuals', label: 'Manuals', icon: FileText },
];

export interface AdminDashboardProps {
  userRole?: string;
  currentAgentName?: string;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  onNavigateToSummary: () => void;
  onTaxonomiesChanged?: () => Promise<void> | void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  userRole: _userRole,
  currentAgentName,
  activeTab,
  onSelectTab,
  onNavigateToSummary,
  onTaxonomiesChanged,
}) => {
  const [currentTab, setCurrentTab] = useState<AdminTabKey>(() => {
    if (activeTab && activeTab.startsWith('admin-') && activeTab !== 'admin-dashboard') {
      const match = ADMIN_TABS.find((t) => t.key === activeTab);
      if (match) return match.key;
    }
    return 'admin-product-catalog';
  });

  // Synchronize internal tab when parent activeTab changes
  useEffect(() => {
    if (activeTab && activeTab.startsWith('admin-') && activeTab !== 'admin-dashboard') {
      const match = ADMIN_TABS.find((t) => t.key === activeTab);
      if (match && match.key !== currentTab) {
        setCurrentTab(match.key);
      }
    }
  }, [activeTab, currentTab]);

  const handleTabChange = (key: AdminTabKey) => {
    setCurrentTab(key);
    if (onSelectTab) {
      onSelectTab(key);
    }
  };

  const isResourceView = currentTab in ADMIN_RESOURCE_CONFIGS;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onNavigateToSummary}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shift Summary</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fotoblue-600 to-fotodeep-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Admin Dashboard
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-fotoblue-100 text-fotoblue-800 dark:bg-fotoblue-950/80 dark:text-fotoblue-300 border border-fotoblue-200/60 dark:border-fotoblue-800/60">
                  Team Lead Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage system product catalogs, classifications, installers, collateral, and technical documentation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Sub-Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200/80 dark:border-slate-800">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-fotoblue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Child View */}
      {isResourceView ? (
        <AdminResourceTableView
          key={currentTab}
          config={ADMIN_RESOURCE_CONFIGS[currentTab as AdminResourceKey]}
          currentAgentName={currentAgentName}
          onTaxonomiesChanged={onTaxonomiesChanged}
        />
      ) : (
        <AdminProductCatalogView
          currentAgentName={currentAgentName}
          onTaxonomiesChanged={onTaxonomiesChanged}
        />
      )}
    </div>
  );
};
