/**
 * @file ClientListItem.tsx
 * @description List view item for ClientDirectory with desktop 12-column layout and mobile stacked layout.
 */

import React from 'react';
import { Building2, Edit2, Trash2 } from 'lucide-react';
import { ClientRecord } from '../../types';
import { ClientPhoneDisplay } from './ClientPhoneDisplay';
import { ClientProductBadges } from './ClientProductBadges';

export interface ClientListItemProps {
  client: ClientRecord;
  phones: string[];
  copiedPhone: string | null;
  onCopyPhone: (phone: string) => void;
  onEdit: (client: ClientRecord) => void;
  onDelete: (client: ClientRecord) => void;
}

export const ClientListItem: React.FC<ClientListItemProps> = ({
  client,
  phones,
  copiedPhone,
  onCopyPhone,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="p-4 sm:px-5 sm:py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors group">
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
            onCopyPhone={onCopyPhone}
          />
        </div>

        {/* Col 3: Owned Equipment */}
        <div className="col-span-4 pr-2">
          <ClientProductBadges products={client.ownedProducts || []} />
        </div>

        {/* Col 4: Action Buttons */}
        <div className="col-span-2 flex items-center justify-end gap-1">
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
              type="button"
              onClick={() => onEdit(client)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-fotoblue-600"
              title="Edit client"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(client)}
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
            onCopyPhone={onCopyPhone}
          />
        </div>

        {/* Mobile Products */}
        <div className="pt-1">
          <ClientProductBadges products={client.ownedProducts || []} />
        </div>
      </div>
    </div>
  );
};
