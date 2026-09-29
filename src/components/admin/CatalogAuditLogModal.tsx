/**
 * @file CatalogAuditLogModal.tsx
 * @description Administrative modal for inspecting the catalog change audit trail,
 * showing timestamps, agent accountability, actions, and cascade impact metrics.
 */

import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  RefreshCw,
  ArrowRight,
  FileEdit,
  Power,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import { CatalogAuditLog } from '../../domain/catalog/types';
import { formatTimeDisplay } from '../../utils/date';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../common/Modal';

export interface CatalogAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: CatalogAuditLog[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const CatalogAuditLogModal: React.FC<CatalogAuditLogModalProps> = ({
  isOpen,
  onClose,
  auditLogs,
  isLoading,
  error,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'rename' | 'create' | 'toggle_active'>('all');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Action filter
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inOld = log.oldValue?.toLowerCase().includes(q) ?? false;
      const inNew = log.newValue?.toLowerCase().includes(q) ?? false;
      const inAgent = log.performedBy.toLowerCase().includes(q);
      const inDetails = JSON.stringify(log.details || {}).toLowerCase().includes(q);

      return inOld || inNew || inAgent || inDetails;
    });
  }, [auditLogs, searchQuery, actionFilter]);

  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'rename':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200/60 dark:border-fotoblue-800/60">
            <FileEdit className="w-3 h-3" />
            Rename
          </span>
        );
      case 'create':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            <PlusCircle className="w-3 h-3" />
            Created
          </span>
        );
      case 'toggle_active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
            <Power className="w-3 h-3" />
            Status Toggle
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {action}
          </span>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="4xl">
      <div className="flex flex-col h-full max-h-[85vh]">
        <ModalHeader
          title="Catalog Change Audit Log"
          subtitle="Complete historical trail of administrative catalog updates, cascades, and accountability"
          icon={<History className="w-5 h-5 text-fotoblue-600 dark:text-fotoblue-400" />}
          onClose={onClose}
        />

        <ModalBody className="space-y-4 flex-1 overflow-y-auto">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search product, agent, or note..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setActionFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    actionFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setActionFilter('rename')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    actionFilter === 'rename'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Renames
                </button>
                <button
                  type="button"
                  onClick={() => setActionFilter('create')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    actionFilter === 'create'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Created
                </button>
                <button
                  type="button"
                  onClick={() => setActionFilter('toggle_active')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    actionFilter === 'toggle_active'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Status Toggles
                </button>
              </div>

              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                title="Refresh audit logs"
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
              {error}
            </div>
          )}

          {/* Logs table */}
          {isLoading && auditLogs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-fotoblue-500 mb-2" />
              <p className="text-xs font-medium">Loading audit history...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No audit entries found.</p>
              <p className="text-[11px] mt-1">
                {searchQuery ? 'Try changing your search term.' : 'Administrative actions will appear here.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-slate-900">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Transformation / Values</th>
                    <th className="py-2.5 px-3">Cascade Impact</th>
                    <th className="py-2.5 px-3">Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((log) => {
                    const rawDate = log.createdAt ? new Date(log.createdAt) : null;
                    const dateStr = rawDate
                      ? rawDate.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—';
                    const timeStr = log.createdAt ? formatTimeDisplay(log.createdAt) : '—';

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {dateStr}
                          </div>
                          <div className="text-[10px] text-slate-400">{timeStr}</div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {renderActionBadge(log.action)}
                        </td>

                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                          {log.action === 'rename' ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium line-through text-slate-400">
                                {log.oldValue}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-bold text-fotoblue-600 dark:text-fotoblue-400">
                                {log.newValue}
                              </span>
                            </div>
                          ) : log.action === 'create' ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {log.newValue}
                            </span>
                          ) : (
                            <div className="text-[11px]">
                              <span className="font-medium text-slate-600 dark:text-slate-400">
                                {log.oldValue}:{' '}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {log.newValue}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {log.details?.affected_clients !== undefined ||
                          log.details?.affected_interactions !== undefined ? (
                            <div className="space-y-0.5 text-[11px]">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 mr-1.5">
                                {log.details.affected_clients || 0} clients
                              </span>
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                {log.details.affected_interactions || 0} logs
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                          {log.performedBy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ModalBody>

        <ModalFooter className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredLogs.length} of {auditLogs.length} audit entries
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </ModalFooter>
      </div>
    </Modal>
  );
};
