/**
 * @file ClientGridCard.tsx
 * @description Grid view card for ClientDirectory displaying client details, contacts, and equipment.
 */

import React from 'react';
import { Building2, Edit2, Trash2, Phone, Package } from 'lucide-react';
import { ClientRecord } from '../../types';
import { ClientPhoneDisplay } from './ClientPhoneDisplay';
import { ClientProductBadges } from './ClientProductBadges';

export interface ClientGridCardProps {
  client: ClientRecord;
  phones: string[];
  copiedPhone: string | null;
  onCopyPhone: (phone: string) => void;
  onEdit: (client: ClientRecord) => void;
  onDelete: (client: ClientRecord) => void;
}

export const ClientGridCard: React.FC<ClientGridCardProps> = ({
  client,
  phones,
  copiedPhone,
  onCopyPhone,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 group">
      <div>
        {/* Header: Name and Action buttons */}
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
              type="button"
              onClick={() => onEdit(client)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-fotoblue-600 hover:bg-fotoblue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Edit client"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(client)}
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
            onCopyPhone={onCopyPhone}
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
};
