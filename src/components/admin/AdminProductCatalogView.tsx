/**
 * @file AdminProductCatalogView.tsx
 * @description Dedicated view for administrative Product Catalog management.
 * Features usage metrics, status filtering, cascading rename execution, and audit log inspection.
 */

import React, { useState, useMemo } from 'react';
import {
  Package,
  Users,
  MessageSquare,
  Plus,
  Search,
  History,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { CatalogProduct } from '../../domain/catalog/types';
import { useAdminDashboard } from '../../application/useAdminDashboard';
import { RenameProductModal } from './RenameProductModal';
import { AddProductModal } from './AddProductModal';
import { CatalogAuditLogModal } from './CatalogAuditLogModal';
import { ConfirmModal } from '../common/ConfirmModal';

export interface AdminProductCatalogViewProps {
  currentAgentName?: string;
  onTaxonomiesChanged?: () => Promise<void> | void;
}

export const AdminProductCatalogView: React.FC<AdminProductCatalogViewProps> = ({
  currentAgentName,
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
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-fotoblue-50 dark:bg-fotoblue-950/60 border border-fotoblue-100 dark:border-fotoblue-900 flex items-center justify-center text-fotoblue-600 dark:text-fotoblue-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Product Catalog
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage supported software products, equipment suites, and hardware configurations.
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

      {/* Product Catalog Management Table */}
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
              aria-label="Search catalog products"
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
                All ({totalProducts})
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
                Inactive ({totalProducts - activeProducts})
              </button>
            </div>

            <button
              type="button"
              onClick={refreshProducts}
              disabled={isLoading}
              title="Refresh catalog list"
              aria-label="Refresh catalog list"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading && products.length === 0 ? (
          <div role="status" aria-busy="true" className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-fotoblue-500 mb-2" />
            <p className="text-xs font-medium">Loading catalog products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div role="status" className="py-16 text-center text-slate-400 dark:text-slate-500">
            <Package className="w-9 h-9 mx-auto mb-2 opacity-50 text-fotoblue-500" />
            <p className="text-sm font-semibold">No catalog products found.</p>
            <p className="text-xs mt-1">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'Click "Add Product" above to create your first product.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label="Product Catalog Table" className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4">Product Name</th>
                  <th scope="col" className="py-3 px-4 text-center">Assigned Clients</th>
                  <th scope="col" className="py-3 px-4 text-center">Interaction Logs</th>
                  <th scope="col" className="py-3 px-4 text-center">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 border border-fotoblue-100 dark:border-fotoblue-900 flex items-center justify-center text-fotoblue-600 dark:text-fotoblue-400 shrink-0">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold">{product.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-medium text-slate-600 dark:text-slate-400">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        {product.clientCount ?? 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-medium text-slate-600 dark:text-slate-400">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        {product.interactionCount ?? 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={product.isActive}
                          onClick={() => setProductToToggle(product)}
                          title={product.isActive ? `Deactivate product "${product.name}"` : `Activate product "${product.name}"`}
                          aria-label={product.isActive ? `Deactivate product "${product.name}"` : `Activate product "${product.name}"`}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500/30 ${
                            product.isActive ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              product.isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            product.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProductToRename(product)}
                          aria-label={`Edit entry "${product.name}"`}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title={`Edit entry "${product.name}"`}
                        >
                          <Edit2 className="w-3 h-3 text-fotoblue-600 dark:text-fotoblue-400" />
                          <span>Edit Entry</span>
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
