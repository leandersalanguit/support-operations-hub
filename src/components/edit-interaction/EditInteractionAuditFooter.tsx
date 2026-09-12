/**
 * @file EditInteractionAuditFooter.tsx
 * @description Renders read-only audit information for an interaction being edited
 * (original creator, creation date, last modified agent, and current saving agent badge).
 */

import React from 'react';
import { User, ShieldCheck } from 'lucide-react';
import { Interaction } from '../../types';
import { formatAgentDisplayName } from '../../domain';

export interface EditInteractionAuditFooterProps {
  interaction: Interaction;
  currentAgentName?: string;
}

export const EditInteractionAuditFooter: React.FC<EditInteractionAuditFooterProps> = ({
  interaction,
  currentAgentName,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs select-none">
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
        <User className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400 shrink-0" />
        <span>
          Original Creator: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{formatAgentDisplayName(interaction.agent) || interaction.agent}</strong>
        </span>
        {interaction.createdAt && (
          <span className="text-slate-400 dark:text-slate-500 text-[11px]">
            ({new Date(interaction.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })})
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {interaction.lastModifiedBy && (
          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px]">
            Last modified by <strong className="text-slate-800 dark:text-slate-200">{formatAgentDisplayName(interaction.lastModifiedBy) || interaction.lastModifiedBy}</strong>
          </span>
        )}
        {currentAgentName && (
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Saving edit as {currentAgentName}
          </span>
        )}
      </div>
    </div>
  );
};
