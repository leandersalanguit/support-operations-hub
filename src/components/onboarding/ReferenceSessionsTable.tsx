/**
 * @file ReferenceSessionsTable.tsx
 * @description Table and list view of booked onboarding sessions on the reference calendar,
 * with search, status filtering, and cancellation management.
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  User,
  Phone,
  Package,
  Globe,
} from 'lucide-react';
import { ScheduledSession, OnboardingSessionStatus } from '../../types';
import { formatDateDisplay } from '../../utils/date';

interface ReferenceSessionsTableProps {
  sessions: ScheduledSession[];
  onCancelSession: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export const ReferenceSessionsTable: React.FC<ReferenceSessionsTableProps> = ({
  sessions,
  onCancelSession,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | OnboardingSessionStatus>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.clientName.toLowerCase().includes(q);
        const matchProduct = s.product.toLowerCase().includes(q);
        const matchPhone = (s.clientPhone || '').toLowerCase().includes(q);
        const matchDate = s.slotDate.toLowerCase().includes(q);
        return matchName || matchProduct || matchPhone || matchDate;
      }
      return true;
    });
  }, [sessions, statusFilter, searchQuery]);

  const handleCancelClick = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this scheduled onboarding session?')) {
      setCancellingId(id);
      try {
        await onCancelSession(id);
      } finally {
        setCancellingId(null);
      }
    }
  };

  const getStatusBadge = (status: OnboardingSessionStatus) => {
    switch (status) {
      case 'booked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Booked
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-fotoblue-50 text-fotoblue-700 dark:bg-fotoblue-950/60 dark:text-fotoblue-300 border border-fotoblue-200 dark:border-fotoblue-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-fotoblue-600 dark:text-fotoblue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Reference Calendar Bookings
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {filteredSessions.length} {filteredSessions.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            All scheduled client onboarding sessions recorded on the operational reference schedule.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-medium">
            {(['all', 'booked', 'completed', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookings..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto mt-4">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Loading reference calendar sessions...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No onboarding sessions found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select an available slot above to schedule a new onboarding session.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3">Client</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3">PHT Slot</th>
                <th className="py-3 px-3">Client Local Time</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredSessions.map((session) => {
                let clientFormattedTime = '';
                try {
                  const clientDateObj = new Date(session.startIso);
                  clientFormattedTime = new Intl.DateTimeFormat('en-US', {
                    timeZone: session.clientTimezone,
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  }).format(clientDateObj);
                } catch {
                  clientFormattedTime = session.startIso;
                }

                return (
                  <tr
                    key={session.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Client Name & Phone */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950/60 flex items-center justify-center text-fotoblue-600 dark:text-fotoblue-400 font-bold shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {session.clientName}
                          </div>
                          {session.clientPhone ? (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <Phone className="w-3 h-3" />
                              <span>{session.clientPhone}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{session.product}</span>
                      </div>
                    </td>

                    {/* PHT Slot Date & Time */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {formatDateDisplay(session.slotDate)}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>PHT Slot: {session.slotId.replace(/^[a-z]+_/, '').replace(/(\d{2})(\d{2})/, '$1:$2')}</span>
                      </div>
                    </td>

                    {/* Client Timezone & Local Time */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-fotoblue-600 dark:text-fotoblue-400">
                        {clientFormattedTime}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>{session.clientTimezone.replace(/_/g, ' ')}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      {getStatusBadge(session.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      {session.status === 'booked' && (
                        <button
                          onClick={() => handleCancelClick(session.id)}
                          disabled={cancellingId === session.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Cancel session to free up slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{cancellingId === session.id ? 'Cancelling...' : 'Cancel'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
