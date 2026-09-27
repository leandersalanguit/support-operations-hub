/**
 * @file AdminDashboard.tsx
 * @description Central administrative dashboard for Team Leads. Provides catalog
 * product management, atomic cascading rename execution, usage statistics, and audit inspection.
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Package,
  Users,
  MessageSquare,
  Plus,
  Search,
  History,
  RefreshCw,
  Edit2,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';
import { CatalogProduct } from '../../domain/catalog/types';
import { useAdminDashboard } from '../../application/useAdminDashboard';
import { RenameProductModal } from './RenameProductModal';
import { AddProductModal } from './AddProductModal';
import { CatalogAuditLogModal } from './CatalogAuditLogModal';
import { ConfirmModal } from '../common/ConfirmModal';

export interface AdminDashboardProps {
  userRole?: string;
  currentAgentName?: string;
  onNavigateToSummary: () => void;
  onTaxonomiesChanged?: () => Promise<void> | void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  userRole: _userRole,
  currentAgentName,
  onNavigateToSummary,
  onTaxonomiesChanged,
}) => {
  const {
    products,
    isLoading,
    error,
    refreshProducts,
    renameProduct,
    addProduct,
    toggleProductActive,
    auditLogs,
    isAuditLoading,
    auditError,
    fetchAuditLogs,
  } = useAdminDashboard({
    currentAgentName,
    onTaxonomiesChanged,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal visibility states
  const [productToRename, setProductToRename] = useState<CatalogProduct | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [productToToggle, setProductToToggle] = useState<CatalogProduct | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);

  // Filter products by search and status
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter === 'active' && !p.isActive) return false;
      if (statusFilter === 'inactive' && p.isActive) return false;
      if (!searchQuery.trim()) return true;
      return p.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    });
  }, [products, searchQuery, statusFilter]);

  // Aggregate summary metrics
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.isActive).length;
  const totalClientsAssigned = products.reduce((acc, p) => acc + (p.clientCount || 0), 0);
  const totalLogsReferenced = products.reduce((acc, p) => acc + (p.interactionCount || 0), 0);

  // Open audit modal and load logs
  const handleOpenAuditModal = () => {
    setIsAuditModalOpen(true);
    fetchAuditLogs();
  };

  // Status toggle handler
  const handleConfirmToggle = async () => {
    if (!productToToggle) return;
    setIsTogglingStatus(true);
    try {
      await toggleProductActive(productToToggle.id, !productToToggle.isActive);
      setProductToToggle(null);
    } catch (err) {
      // Handled in hook
    } finally {
      setIsTogglingStatus(false);
    }
  };

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
                Manage system product catalogs, execute cascading renames across CRM & logs, and review audit trails.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
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
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Error notification banner if any */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Products
            </span>
            <Package className="w-4 h-4 text-fotoblue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalProducts}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            in system catalog
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Active Products
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {activeProducts}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            available for logging
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Assigned Clients
            </span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalClientsAssigned}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            client product links
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Logged Interactions
            </span>
            <MessageSquare className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalLogsReferenced}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            historical support logs
          </span>
        </div>
      </div>

      {/* Product Catalog Management Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog products..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500/20"
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
                All ({products.length})
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
                Active ({activeProducts})
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
                Inactive ({products.length - activeProducts})
              </button>
            </div>

            <button
              type="button"
              onClick={refreshProducts}
              disabled={isLoading}
              title="Refresh products list"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Product Table */}
        {isLoading && products.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-fotoblue-500 mb-3" />
            <p className="text-sm font-semibold">Loading product catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">No products found</p>
            <p className="text-xs mt-1">
              {searchQuery ? 'Try adjusting your search query.' : 'Click "Add Product" to create your first entry.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Catalog Status</th>
                  <th className="py-3 px-4">Client Assignments</th>
                  <th className="py-3 px-4">Logged Interactions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <span className="truncate">{product.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {product.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{product.clientCount ?? 0}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span>{product.interactionCount ?? 0}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProductToRename(product)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="Rename product and cascade updates"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                          <span>Rename</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProductToToggle(product)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            product.isActive
                              ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                              : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                          }`}
                          title={product.isActive ? 'Deactivate product' : 'Activate product'}
                        >
                          {product.isActive ? (
                            <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rename Product Modal */}
      <RenameProductModal
        isOpen={!!productToRename}
        onClose={() => setProductToRename(null)}
        product={productToRename}
        onRename={async (oldName, newName) => {
          await renameProduct(oldName, newName);
        }}
      />

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingProductNames={products.map((p) => p.name)}
        onAdd={async (name) => {
          await addProduct(name);
        }}
      />

      {/* Catalog Audit Log Modal */}
      <CatalogAuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditLogs={auditLogs}
        isLoading={isAuditLoading}
        error={auditError}
        onRefresh={fetchAuditLogs}
      />

      {/* Status Toggle Confirmation Modal */}
      <ConfirmModal
        isOpen={!!productToToggle}
        onClose={() => setProductToToggle(null)}
        onConfirm={handleConfirmToggle}
        title={
          productToToggle?.isActive
            ? `Deactivate "${productToToggle?.name}"?`
            : `Activate "${productToToggle?.name}"?`
        }
        description={
          productToToggle?.isActive
            ? 'Deactivated products will no longer appear in new client creation or support interaction logging dropdowns. Existing assignments and logs will remain intact.'
            : 'Activated products will immediately become available in client creation and interaction logging forms.'
        }
        confirmText={productToToggle?.isActive ? 'Deactivate Product' : 'Activate Product'}
        variant={productToToggle?.isActive ? 'warning' : 'info'}
        isLoading={isTogglingStatus}
      />
    </div>
  );
};
