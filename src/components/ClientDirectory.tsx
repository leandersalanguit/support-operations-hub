/**
 * @file ClientDirectory.tsx
 * @description Dedicated Client Directory view for Support Operations Hub.
 * Provides searching, viewing, creating, editing, and deleting client records,
 * their multiple phone numbers, and owned equipment and software.
 * Decomposed into modular subcomponents (ClientProductBadges, ClientPhoneDisplay, ClientListItem, ClientGridCard).
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  ArrowLeft,
  LayoutList,
  LayoutGrid,
  X,
} from 'lucide-react';
import { ClientRecord } from '../types';
import { useTaxonomies } from '../application';
import { formatPhoneNumber } from '../domain';
import { useClipboardCopy } from '../utils/clipboard';
import { ConfirmModal } from './common';
import { ClientFormModal } from './ClientFormModal';
import { ClientListItem, ClientGridCard } from './client-directory';

interface ClientDirectoryProps {
  clients: ClientRecord[];
  currentAgentName?: string;
  onUpdateClients: (clients: ClientRecord[]) => void;
  onNavigateToSummary: () => void;
}

export const ClientDirectory: React.FC<ClientDirectoryProps> = ({
  clients,
  currentAgentName,
  onUpdateClients,
  onNavigateToSummary,
}) => {
  const { products: catalogProducts } = useTaxonomies();
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const { copiedId: copiedPhone, copy: copyPhone } = useClipboardCopy(2000);

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);

  // Delete confirmation
  const [clientToDelete, setClientToDelete] = useState<ClientRecord | null>(null);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q && productFilter === 'All') return true;
      const qDigits = q.replace(/\D/g, '');

      const matchesSearch =
        !q ||
        client.name.toLowerCase().includes(q) ||
        (client.phoneNumbers &&
          client.phoneNumbers.some(
            (p) =>
              p.toLowerCase().includes(q) ||
              (qDigits.length >= 3 && p.replace(/\D/g, '').includes(qDigits))
          )) ||
        (client.phoneNumber &&
          (client.phoneNumber.toLowerCase().includes(q) ||
            (qDigits.length >= 3 && client.phoneNumber.replace(/\D/g, '').includes(qDigits)))) ||
        (client.ownedProducts && client.ownedProducts.some((p) => p.toLowerCase().includes(q)));

      const matchesProduct =
        productFilter === 'All' ||
        (client.ownedProducts && client.ownedProducts.includes(productFilter));

      return matchesSearch && matchesProduct;
    });
  }, [clients, searchQuery, productFilter]);

  // Aggregate stats
  const totalProductsCount = useMemo(() => {
    return clients.reduce((acc, c) => acc + (c.ownedProducts?.length || 0), 0);
  }, [clients]);

  const handleCopyPhone = (phone: string) => {
    copyPhone(phone);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (client: ClientRecord) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  // Save Create or Edit
  const handleSaveClient = (savedClient: ClientRecord) => {
    if (editingClient) {
      const updatedList = clients.map((c) => (c.id === savedClient.id ? savedClient : c));
      onUpdateClients(updatedList);
    } else {
      onUpdateClients([savedClient, ...clients]);
    }
  };

  // Confirm and delete client
  const handleConfirmDelete = () => {
    if (!clientToDelete) return;
    const updatedList = clients.filter((c) => c.id !== clientToDelete.id);
    onUpdateClients(updatedList);
    setClientToDelete(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToSummary}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Back to Shift Summary"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Client Directory</h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage client records, contact numbers, and owned products.
            </p>
          </div>
        </div>

        {/* Action Button & Metric Badges */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300">
              {clients.length} Clients
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 font-semibold text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200/60 dark:border-fotoblue-800/60">
              {totalProductsCount} Products Registered
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-fotoblue-600 to-fotodeep-600 hover:from-fotoblue-700 hover:to-fotodeep-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, phone number, or product..."
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-fotoblue-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Product Filter */}
        <div className="sm:w-56 relative">
          <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-fotoblue-500 shadow-2xs cursor-pointer"
          >
            <option value="All">All Products ({clients.length})</option>
            {catalogProducts.map((prod) => {
              const count = clients.filter((c) => c.ownedProducts?.includes(prod)).length;
              return (
                <option key={prod} value={prod}>
                  {prod} {count > 0 ? `(${count})` : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* View Mode Switcher: List vs Grid */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 text-fotoblue-600 dark:text-fotoblue-400 shadow-2xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="List view"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-700 text-fotoblue-600 dark:text-fotoblue-400 shadow-2xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Grid / blocks view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Clients Display: List or Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Clients Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || productFilter !== 'All'
              ? 'Try adjusting your search criteria or filter to locate the client.'
              : 'Clients are automatically saved when you log interactions, or you can add one now.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fotoblue-600 text-white text-xs font-bold hover:bg-fotoblue-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Client</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
          {/* Table Header for Desktop */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider items-center">
            <div className="col-span-3">Client</div>
            <div className="col-span-3">Contact Number(s)</div>
            <div className="col-span-4">Owned Equipment</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* List Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filteredClients.map((client) => {
              const rawPhones = client.phoneNumbers && client.phoneNumbers.length > 0
                ? client.phoneNumbers
                : client.phoneNumber
                ? [client.phoneNumber]
                : [];
              const phones = Array.from(new Set(rawPhones.map((p) => formatPhoneNumber(p)).filter(Boolean)));

              return (
                <ClientListItem
                  key={client.id}
                  client={client}
                  phones={phones}
                  copiedPhone={copiedPhone}
                  onCopyPhone={handleCopyPhone}
                  onEdit={handleOpenEdit}
                  onDelete={setClientToDelete}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const rawPhones = client.phoneNumbers && client.phoneNumbers.length > 0
              ? client.phoneNumbers
              : client.phoneNumber
              ? [client.phoneNumber]
              : [];
            const phones = Array.from(new Set(rawPhones.map((p) => formatPhoneNumber(p)).filter(Boolean)));

            return (
              <ClientGridCard
                key={client.id}
                client={client}
                phones={phones}
                copiedPhone={copiedPhone}
                onCopyPhone={handleCopyPhone}
                onEdit={handleOpenEdit}
                onDelete={setClientToDelete}
              />
            );
          })}
        </div>
      )}

      {/* Create / Edit Client Modal */}
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        client={editingClient}
        existingClients={clients}
        currentAgentName={currentAgentName}
        onSave={handleSaveClient}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Client Record?"
        description={
          clientToDelete ? (
            <>
              Are you sure you want to delete <strong>{clientToDelete.name}</strong>? This removes their stored equipment and phone numbers.
            </>
          ) : undefined
        }
        confirmText="Delete Client"
      />
    </div>
  );
};
