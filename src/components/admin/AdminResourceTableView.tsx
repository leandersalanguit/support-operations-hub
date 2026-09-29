/**
 * @file AdminResourceTableView.tsx
 * @description Standardized administrative management table view for support operations catalogs
 * (Case Classifications, Installers, Marketing Folders, Quick Start Guides, Recommended Hardware, Manuals).
 * Features live Supabase sync, active/inactive status toggling, audit history, and schema-driven entry creation.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  History,
  RefreshCw,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { AdminResourceConfig } from '../../utils/adminResourceConfig';
import { resourceAdminRepo } from '../../infrastructure/supabase/resourceAdminRepo';
import { GenericResourceAddModal } from './GenericResourceAddModal';
import { CatalogAuditLogModal } from './CatalogAuditLogModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { CatalogAuditLog } from '../../domain/catalog/types';

export interface AdminResourceTableViewProps {
  config: AdminResourceConfig;
  currentAgentName?: string;
  onTaxonomiesChanged?: () => Promise<void> | void;
}

export const AdminResourceTableView: React.FC<AdminResourceTableViewProps> = ({
  config,
  currentAgentName,
  onTaxonomiesChanged,
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [itemToToggle, setItemToToggle] = useState<any | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<CatalogAuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  /**
   * Loads all entries for this resource catalog
   */
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await resourceAdminRepo.fetchItems(config);
      setItems(data);
    } catch (err: any) {
      console.error(`[AdminResourceTableView] Failed to load ${config.tableName}:`, err);
      setError(err?.message || `Failed to load ${config.title.toLowerCase()}.`);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  /**
   * Loads audit history logs for this resource catalog
   */
  const loadAuditLogs = useCallback(async () => {
    setIsAuditLoading(true);
    setAuditError(null);
    try {
      const logs = await resourceAdminRepo.getAuditLogs(config.catalogType, 100);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error(`[AdminResourceTableView] Failed to load audit logs:`, err);
      setAuditError(err?.message || 'Failed to load catalog audit history.');
    } finally {
      setIsAuditLoading(false);
    }
  }, [config.catalogType]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleOpenAuditModal = () => {
    setIsAuditModalOpen(true);
    loadAuditLogs();
  };

  /**
   * Handles adding a new resource entry
   */
  const handleAddItem = async (values: Record<string, any>) => {
    const actor = currentAgentName || 'Team Lead';
    await resourceAdminRepo.createItem(config, values, actor);
    await loadItems();

    if (onTaxonomiesChanged) {
      try {
        await onTaxonomiesChanged();
      } catch (e) {
        console.warn('[AdminResourceTableView] Warning refreshing taxonomies:', e);
      }
    }
  };

  /**
   * Handles toggling item active status
   */
  const handleConfirmToggle = async () => {
    if (!itemToToggle) return;
    setIsTogglingStatus(true);
    try {
      const actor = currentAgentName || 'Team Lead';
      const newStatus = !itemToToggle.is_active;

      // Optimistic UI update
      setItems((prev) =>
        prev.map((it) => (it.id === itemToToggle.id ? { ...it, is_active: newStatus } : it))
      );

      await resourceAdminRepo.toggleActive(
        config,
        itemToToggle.id,
        itemToToggle.name,
        newStatus,
        actor
      );

      setItemToToggle(null);
      await loadItems();

      if (onTaxonomiesChanged) {
        try {
          await onTaxonomiesChanged();
        } catch (e) {
          console.warn('[AdminResourceTableView] Warning refreshing taxonomies:', e);
        }
      }
    } catch (err: any) {
      console.error('[AdminResourceTableView] Failed to toggle status:', err);
      setError(err?.message || 'Failed to update item status.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (statusFilter === 'active' && !item.is_active) return false;
      if (statusFilter === 'inactive' && item.is_active) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inName = item.name?.toLowerCase().includes(q) ?? false;
      const inVersion = item.version?.toLowerCase().includes(q) ?? false;
      const inDesc = item.description?.toLowerCase().includes(q) ?? false;
      const inUrl = item.url?.toLowerCase().includes(q) ?? false;
      const inCat = Array.isArray(item.categories)
        ? item.categories.some((c: string) => c.toLowerCase().includes(q))
        : (item.category?.toLowerCase().includes(q) ?? false);

      return inName || inVersion || inDesc || inUrl || inCat;
    });
  }, [items, searchQuery, statusFilter]);

  // Aggregate metrics
  const totalItems = items.length;
  const activeItems = items.filter((it) => it.is_active).length;
  const inactiveItems = totalItems - activeItems;

  const Icon = config.icon;

  return (
    <div className="space-y-6">
      {/* Section Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-fotoblue-50 dark:bg-fotoblue-950/60 border border-fotoblue-100 dark:border-fotoblue-900 flex items-center justify-center text-fotoblue-600 dark:text-fotoblue-400">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {config.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {config.description}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleOpenAuditModal}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
          >
            <History className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400" />
            <span>Audit History</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-fotoblue-600 to-fotodeep-600 hover:from-fotoblue-700 hover:to-fotodeep-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add {config.singular}</span>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total {config.title}
            </span>
            <Layers className="w-4 h-4 text-fotoblue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalItems}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            configured in database
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Active Entries
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {activeItems}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            available in application
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Inactive Entries
            </span>
            <ToggleLeft className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">
            {inactiveItems}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            hidden from user views
          </span>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={config.searchPlaceholder}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All ({totalItems})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Active ({activeItems})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'inactive'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Inactive ({inactiveItems})
              </button>
            </div>

            <button
              type="button"
              onClick={loadItems}
              disabled={isLoading}
              title="Refresh catalog"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table Body */}
        {isLoading && items.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-fotoblue-500 mb-2" />
            <p className="text-xs font-medium">Loading {config.title.toLowerCase()}...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <Icon className="w-9 h-9 mx-auto mb-2 opacity-50 text-fotoblue-500" />
            <p className="text-sm font-semibold">No {config.title.toLowerCase()} found.</p>
            <p className="text-xs mt-1">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : `Click "Add ${config.singular}" above to create your first entry.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Name / Title</th>
                  {config.tableName !== 'case_classifications' && (
                    <th className="py-3 px-4">Link / Resource</th>
                  )}
                  <th className="py-3 px-4">Category / Tags</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const categories = Array.isArray(item.categories)
                    ? item.categories
                    : item.category
                    ? [item.category]
                    : [];

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
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
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 text-fotoblue-600 dark:text-fotoblue-400 hover:underline max-w-[200px] truncate"
                              title={item.url}
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
                        <button
                          type="button"
                          onClick={() => setItemToToggle(item)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            item.is_active
                              ? 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                              : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                          title={item.is_active ? 'Deactivate entry' : 'Activate entry'}
                        >
                          {item.is_active ? (
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Resource Modal */}
      <GenericResourceAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        config={config}
        onAdd={handleAddItem}
      />

      {/* Audit History Modal (Strictly Read-Only: No edit or delete buttons) */}
      <CatalogAuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditLogs={auditLogs}
        isLoading={isAuditLoading}
        error={auditError}
        onRefresh={loadAuditLogs}
      />

      {/* Confirm Status Toggle Modal */}
      <ConfirmModal
        isOpen={!!itemToToggle}
        onClose={() => setItemToToggle(null)}
        onConfirm={handleConfirmToggle}
        title={
          itemToToggle?.is_active
            ? `Deactivate "${itemToToggle?.name}"?`
            : `Activate "${itemToToggle?.name}"?`
        }
        description={
          itemToToggle?.is_active
            ? `Deactivating will hide this entry from general user views and dropdowns. You can reactivate it at any time.`
            : `Activating will immediately make this entry visible and selectable across the platform.`
        }
        confirmText={
          isTogglingStatus
            ? 'Updating...'
            : itemToToggle?.is_active
            ? 'Deactivate'
            : 'Activate'
        }
        cancelText="Cancel"
        variant={itemToToggle?.is_active ? 'danger' : 'info'}
      />
    </div>
  );
};
