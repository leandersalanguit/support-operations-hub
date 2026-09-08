/**
 * @file ClientDirectory.tsx
 * @description Dedicated Client Directory view for Support Operations Hub.
 * Provides searching, viewing, creating, editing, and deleting client records,
 * their multiple phone numbers, and owned equipment and software.
 */

import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Package,
  Edit2,
  Trash2,
  Check,
  X,
  Copy,
  Building2,
  Filter,
  ArrowLeft,
  LayoutList,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';
import { ClientRecord } from '../types';
import { useTaxonomies } from '../application';
import { formatPhoneNumber } from '../domain';
import { useClipboardCopy } from '../utils/clipboard';
import { ConfirmModal, useClickOutside } from './common';
import { ClientFormModal } from './ClientFormModal';

/**
 * Renders owned product badges constrained to at most 2 lines,
 * with a 'Show more' dropdown if there are additional products.
 */
const ClientProductBadges: React.FC<{ products: string[] }> = ({ products }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(products.length);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMeasured, setIsMeasured] = useState(false);

  // Close dropdown on outside click or Escape
  useClickOutside(dropdownRef, () => setIsDropdownOpen(false), {
    enabled: isDropdownOpen,
    closeOnEscape: true,
  });

  // Measure visible badges that fit within 2 lines
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || products.length <= 1) {
      setVisibleCount(products.length);
      setIsMeasured(true);
      return;
    }

    const badges = Array.from(container.querySelectorAll<HTMLElement>('.product-badge'));
    if (badges.length === 0) return;

    // Detect distinct line tops by checking offsetTop
    const lineTops: number[] = [];
    badges.forEach((b) => {
      const top = b.offsetTop;
      if (!lineTops.some((t) => Math.abs(t - top) < 8)) {
        lineTops.push(top);
      }
    });
    lineTops.sort((a, b) => a - b);

    // If 2 or fewer lines, all currently rendered badges fit on 2 lines
    if (lineTops.length <= 2) {
      setIsMeasured(true);
      return;
    }

    // Line 3 starts at lineTops[2]
    const line3Top = lineTops[2];
    const line1And2Badges = badges.filter((b) => b.offsetTop < line3Top - 4);
    let countThatFit = line1And2Badges.length;

    // Ensure space on line 2 for the '+N more ▾' button (~72px)
    const lastBadge = line1And2Badges[line1And2Badges.length - 1];
    if (lastBadge) {
      const containerWidth = container.clientWidth;
      const badgeRight = lastBadge.offsetLeft + lastBadge.offsetWidth;
      if (containerWidth - badgeRight < 72 && countThatFit > 1) {
        countThatFit -= 1;
      }
    }

    const finalCount = Math.max(1, countThatFit);
    setVisibleCount(finalCount);
    setIsMeasured(true);
  }, [products, products.length]);

  // Recalculate on container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined' || products.length <= 1) return;

    let prevWidth = container.clientWidth;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (Math.abs(width - prevWidth) > 10) {
          prevWidth = width;
          setVisibleCount(products.length);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [products.length]);

  if (products.length === 0) {
    return <span className="text-xs text-slate-400 italic">No equipment recorded</span>;
  }

  const visibleProducts = products.slice(0, visibleCount);
  const hiddenProducts = products.slice(visibleCount);
  const hasMore = hiddenProducts.length > 0;

  return (
    <div
      ref={containerRef}
      className={`flex flex-wrap gap-1.5 items-center relative ${
        !isMeasured ? 'max-h-[56px] overflow-hidden' : ''
      }`}
    >
      {visibleProducts.map((prod) => (
        <span
          key={prod}
          className="product-badge text-[11px] font-semibold px-2 py-0.5 rounded-md bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-800 dark:text-fotoblue-300 border border-fotoblue-200/80 dark:border-fotoblue-800/60 whitespace-nowrap"
        >
          {prod}
        </span>
      ))}

      {hasMore && (
        <div className="relative inline-block" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`product-more-btn inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer whitespace-nowrap ${
              isDropdownOpen
                ? 'bg-fotoblue-600 text-white border-fotoblue-600 shadow-2xs'
                : 'bg-fotoblue-100/70 hover:bg-fotoblue-200/80 dark:bg-fotoblue-950/90 dark:hover:bg-fotoblue-900 text-fotoblue-800 dark:text-fotoblue-200 border-fotoblue-300/90 dark:border-fotoblue-700/90'
            }`}
            title={`Show ${hiddenProducts.length} more products`}
          >
            <span>+{hiddenProducts.length} more</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-150 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 z-50 w-64 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Additional Equipment ({hiddenProducts.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {hiddenProducts.map((prod) => (
                  <span
                    key={prod}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-800 dark:text-fotoblue-300 border border-fotoblue-200/80 dark:border-fotoblue-800/60 whitespace-nowrap"
                  >
                    {prod}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Formats contact numbers cleanly, with primary phone and
 * a show-more dropdown if a client has multiple numbers.
 */
const ClientPhoneDisplay: React.FC<{
  phones: string[];
  copiedPhone: string | null;
  onCopyPhone: (phone: string) => void;
}> = ({ phones, copiedPhone, onCopyPhone }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setIsOpen(false), {
    enabled: isOpen,
    closeOnEscape: true,
  });

  if (phones.length === 0) {
    return <span className="text-xs text-slate-400 italic">No phone number</span>;
  }

  const primary = phones[0];
  const extras = phones.slice(1);

  return (
    <div className="flex items-center gap-1.5 flex-wrap relative" ref={ref}>
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-xs font-mono text-slate-800 dark:text-slate-200">
        <span>{primary}</span>
        <button
          type="button"
          onClick={() => onCopyPhone(primary)}
          className="text-slate-400 hover:text-fotoblue-600 dark:hover:text-fotoblue-400 cursor-pointer p-0.5 transition-colors"
          title="Copy phone number"
        >
          {copiedPhone === primary ? (
            <Check className="w-3 h-3 text-emerald-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>

      {extras.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isOpen
                ? 'bg-fotoblue-50 dark:bg-fotoblue-950/70 border-fotoblue-400 text-fotoblue-800 dark:text-fotoblue-200'
                : 'bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-600 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title={`View ${extras.length} more phone numbers`}
          >
            <span>+{extras.length} more</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-56 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-1.5 animate-fadeIn">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pb-1 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <span>Other Numbers ({extras.length})</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                {extras.map((p) => (
                  <div
                    key={p}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700 text-xs"
                  >
                    <span className="font-mono text-slate-800 dark:text-slate-200">{p}</span>
                    <button
                      type="button"
                      onClick={() => onCopyPhone(p)}
                      className="text-slate-400 hover:text-fotoblue-600 dark:hover:text-fotoblue-400 cursor-pointer p-0.5"
                      title="Copy number"
                    >
                      {copiedPhone === p ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
                <div
                  key={client.id}
                  className="p-4 sm:px-5 sm:py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors group"
                >
                  {/* Desktop 12-column row */}
                  <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                    {/* Col 1: Client Name */}
                    <div className="col-span-3 flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-xl bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-600 dark:text-fotoblue-400 flex items-center justify-center shrink-0 border border-fotoblue-100 dark:border-fotoblue-900/50">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={client.name}>
                          {client.name}
                        </h3>
                      </div>
                    </div>

                    {/* Col 2: Contact Numbers */}
                    <div className="col-span-3 pr-2">
                      <ClientPhoneDisplay
                        phones={phones}
                        copiedPhone={copiedPhone}
                        onCopyPhone={handleCopyPhone}
                      />
                    </div>

                    {/* Col 3: Owned Equipment (max 2 lines + show more dropdown) */}
                    <div className="col-span-4 pr-2">
                      <ClientProductBadges products={client.ownedProducts || []} />
                    </div>

                    {/* Col 4: Action Buttons */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-fotoblue-600 hover:bg-fotoblue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Edit client"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setClientToDelete(client)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile / Tablet compact stacked view */}
                  <div className="md:hidden space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-600 dark:text-fotoblue-400 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {client.name}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(client)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-fotoblue-600"
                          title="Edit client"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setClientToDelete(client)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                          title="Delete client"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Phone Numbers */}
                    <div className="pt-1">
                      <ClientPhoneDisplay
                        phones={phones}
                        copiedPhone={copiedPhone}
                        onCopyPhone={handleCopyPhone}
                      />
                    </div>

                    {/* Mobile Products */}
                    <div className="pt-1">
                      <ClientProductBadges products={client.ownedProducts || []} />
                    </div>
                  </div>
                </div>
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
              <div
                key={client.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 group"
              >
                {/* Header: Name and Action buttons */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400 shrink-0" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {client.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-fotoblue-600 hover:bg-fotoblue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Edit client"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setClientToDelete(client)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Phone Numbers Section */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-500" />
                        <span>Phone Numbers ({phones.length})</span>
                      </span>
                    </div>
                    <ClientPhoneDisplay
                      phones={phones}
                      copiedPhone={copiedPhone}
                      onCopyPhone={handleCopyPhone}
                    />
                  </div>

                  {/* Owned Products Section */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-fotoblue-500" />
                        <span>Owned Products ({client.ownedProducts?.length || 0})</span>
                      </span>
                    </div>
                    <ClientProductBadges products={client.ownedProducts || []} />
                  </div>
                </div>
              </div>
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
