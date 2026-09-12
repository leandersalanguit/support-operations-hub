/**
 * @file InteractionTableRow.tsx
 * @description Single interaction row renderer for the InteractionTable component.
 * Displays date, client, agent, channel, product, case classification, status pill, metadata indicators,
 * expandable notes with line clamp, and authorized action buttons (Copy TSV, Edit, Delete).
 */

import React from 'react';
import {
  Interaction,
  STATUS_OPTIONS,
} from '../../types';
import { SupportTier } from '../../infrastructure/supabase/configRepo';
import {
  Phone,
  MessageSquare,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { parseChannelDetails } from '../../utils/channelDetails';
import { formatAgentDisplayName, canModifyInteractionPolicy, UserRole } from '../../domain';
import { SupportLicenseBadge } from './SupportLicenseBadge';

export interface InteractionTableRowProps {
  /** The interaction record to display */
  item: Interaction;
  /** List of support tiers for license matching */
  supportTiers?: SupportTier[];
  /** Current authenticated user */
  currentUser?: any;
  /** Current user role */
  userRole?: UserRole;
  /** Current agent display name */
  currentAgentName?: string;
  /** Whether the additional notes are currently expanded */
  isNoteExpanded: boolean;
  /** Callback to toggle note expansion */
  onToggleNoteExpand: (id: string) => void;
  /** Callback when user clicks copy row */
  onCopyRow: (item: Interaction) => void;
  /** Whether this row's content has just been copied */
  isCopied: boolean;
  /** Callback when edit button is clicked */
  onEdit: (item: Interaction) => void;
  /** Callback when delete button is clicked */
  onDelete: (item: Interaction) => void;
}

/**
 * Helper to render channel details using parsed channel metadata.
 */
const renderChannelDetails = (details: string, channel: string) => {
  const parsed = parseChannelDetails(details, channel);

  if (parsed.type === 'empty') {
    return <span className="text-slate-400 dark:text-slate-500 font-mono text-xs mt-0.5 inline-block">—</span>;
  }

  if (parsed.url) {
    return (
      <a
        href={parsed.url}
        target="_blank"
        rel="noopener noreferrer"
        title={parsed.title || parsed.url}
        className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-fotodeep-700 dark:text-fotodeep-300 bg-fotodeep-50 dark:bg-fotodeep-950/60 hover:bg-fotodeep-100 dark:hover:bg-fotodeep-900/80 hover:text-fotodeep-900 dark:hover:text-fotodeep-100 border border-fotodeep-200/80 dark:border-fotodeep-800 px-1.5 py-0.5 rounded-md whitespace-nowrap transition-colors group cursor-pointer mt-0.5"
      >
        <span>{parsed.label}</span>
        <ExternalLink className="w-2.5 h-2.5 text-fotodeep-500 dark:text-fotodeep-400 group-hover:text-fotodeep-800 dark:group-hover:text-fotodeep-200 shrink-0" />
      </a>
    );
  }

  return (
    <div className="text-xs text-slate-700 dark:text-slate-300 font-mono mt-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/80 px-1.5 py-0.5 rounded-md whitespace-nowrap inline-block">
      {parsed.label}
    </div>
  );
};

/**
 * Formats multi-line labels for specific long status names.
 */
const renderStatusContent = (status: string) => {
  switch (status) {
    case 'Waiting for an update from client':
    case 'Waiting for update':
      return (
        <span className="flex flex-col leading-tight">
          <span>Waiting for</span>
          <span>update</span>
        </span>
      );
    case 'Provided an alternative solution':
    case 'Alternative solution':
      return (
        <span className="flex flex-col leading-tight">
          <span>Alternative</span>
          <span>solution</span>
        </span>
      );
    case 'Need to follow up':
    case 'Need follow-up':
      return (
        <span className="flex flex-col leading-tight">
          <span>Need</span>
          <span>follow-up</span>
        </span>
      );
    default:
      return <span className="leading-tight">{status}</span>;
  }
};

export const InteractionTableRow: React.FC<InteractionTableRowProps> = React.memo(({
  item,
  supportTiers,
  currentUser,
  userRole,
  currentAgentName,
  isNoteExpanded,
  onToggleNoteExpand,
  onCopyRow,
  isCopied,
  onEdit,
  onDelete,
}) => {
  const statusMeta =
    STATUS_OPTIONS.find((s) => s.label === item.status) || STATUS_OPTIONS[0];
  const isLongNote =
    item.additionalNotes &&
    (item.additionalNotes.length > 115 || (item.additionalNotes.match(/\n/g) || []).length >= 3);
  const canModify = canModifyInteractionPolicy(item.agent, currentUser, userRole, currentAgentName);
  const agentLabel = formatAgentDisplayName(item.agent) || item.agent || 'the authoring agent';

  return (
    <tr className="hover:bg-fotoblue-50/20 dark:hover:bg-slate-800/60 transition-colors group divide-x divide-slate-100 dark:divide-slate-800/50">
      {/* Date & Day Column */}
      <td className="py-3.5 px-3.5 w-28 sm:w-32 align-middle whitespace-nowrap">
        <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{item.date}</div>
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
          <span>{item.dayOfWeek || '—'}</span>
        </div>
      </td>

      {/* Client & Agent Column */}
      <td className="py-3.5 px-3 w-40 sm:w-48 align-middle">
        <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug" title={item.clientName}>
          {item.clientName}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
          <span className="shrink-0">Agent:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate" title={item.agent}>
            {formatAgentDisplayName(item.agent) || item.agent}
          </span>
        </div>
      </td>

      {/* Channel & Details Column */}
      <td className="py-3.5 px-3 w-32 sm:w-36 align-middle">
        <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm">
          {item.channel === 'Call' ? (
            <span className="flex items-center gap-1 text-fotoblue-700 dark:text-fotoblue-300 font-bold">
              <Phone className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
              <span>Call</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-fotodeep-600 dark:text-fotodeep-300 font-bold">
              <MessageSquare className="w-3.5 h-3.5 text-fotodeep-500 dark:text-fotodeep-400" />
              <span>Chat</span>
            </span>
          )}
        </div>
        {renderChannelDetails(item.channelDetails, item.channel)}
      </td>

      {/* Product & Case Classification Column */}
      <td className="py-3.5 px-3 w-32 sm:w-36 align-middle">
        <div className="inline-block px-2 py-0.5 bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-900 dark:text-fotoblue-200 font-bold rounded-md text-[11px] border border-fotoblue-200/80 dark:border-fotoblue-800">
          {item.clientProduct}
        </div>
        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 leading-snug">
          {item.caseClassification}
        </div>
      </td>

      {/* Status Column with Standardized Badge Pill */}
      <td className="py-2.5 px-1.5 w-22 sm:w-26 align-middle text-center">
        <div className="flex items-center justify-center">
          <span
            title={item.status}
            className={`w-full max-w-[88px] inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-semibold border ${statusMeta.badgeBg} ${statusMeta.badgeBorder}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dotColor}`} />
            {renderStatusContent(item.status)}
          </span>
        </div>
      </td>

      {/* Details Flags Column - Standardized Metadata Status Indicators */}
      <td className="py-2.5 px-2 w-20 sm:w-24 align-middle text-center">
        <div className="flex flex-col items-center justify-center gap-1 select-none">
          {/* Support License Indicator */}
          <SupportLicenseBadge license={item.license} supportTiers={supportTiers} />

          {/* In Event Indicator */}
          <span
            title={item.inEvent ? 'In Event: YES' : 'In Event: NO'}
            className={`w-full max-w-[82px] inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium border border-transparent ${
              item.inEvent
                ? 'text-fotoblue-700 dark:text-fotoblue-300 bg-fotoblue-50/90 dark:bg-fotoblue-950/40 font-semibold'
                : 'text-slate-400 dark:text-slate-500 bg-slate-50/90 dark:bg-slate-800/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                item.inEvent ? 'bg-fotoblue-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            <span>Event</span>
          </span>

          {/* 1st Time User Indicator */}
          <span
            title={
              item.firstTimeUser
                ? 'First Time Using Product: YES'
                : 'First Time Using Product: NO'
            }
            className={`w-full max-w-[82px] inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium border border-transparent ${
              item.firstTimeUser
                ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/40 font-semibold'
                : 'text-slate-400 dark:text-slate-500 bg-slate-50/90 dark:bg-slate-800/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                item.firstTimeUser ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            <span>1st User</span>
          </span>
        </div>
      </td>

      {/* Notes Column (flexible expansion, 3-line preview before expansion) */}
      <td className="py-3.5 px-3 align-middle min-w-[200px]">
        {item.additionalNotes ? (
          <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
            <p
              className={`whitespace-pre-wrap leading-relaxed ${
                !isNoteExpanded && isLongNote ? 'line-clamp-3' : ''
              }`}
            >
              {item.additionalNotes}
            </p>
            {isLongNote && (
              <button
                type="button"
                onClick={() => onToggleNoteExpand(item.id)}
                className="text-xs text-fotoblue-600 dark:text-fotoblue-400 hover:text-fotoblue-800 dark:hover:text-fotoblue-300 font-bold mt-1 flex items-center gap-0.5 cursor-pointer"
              >
                {isNoteExpanded ? (
                  <>
                    <span>Show less</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Read more</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <span className="text-slate-300 dark:text-slate-600 italic text-xs">— No notes —</span>
        )}
      </td>

      {/* Row Actions Column - Distinct Interactive Buttons */}
      <td className="py-2.5 px-2 w-20 sm:w-22 align-middle text-center whitespace-nowrap">
        <div className="flex flex-col items-center justify-center gap-1">
          {/* Copy Button - Always active for all users */}
          <button
            type="button"
            onClick={() => onCopyRow(item)}
            className={`w-full max-w-[62px] inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 ${
              isCopied
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-800'
            }`}
            title={isCopied ? 'Copied to clipboard!' : 'Copy row for Excel'}
            aria-label="Copy row for Excel"
          >
            {isCopied ? (
              <Check className="w-2.5 h-2.5 text-white shrink-0" />
            ) : (
              <Copy className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400 shrink-0" />
            )}
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Edit Button - Active for author or Team Lead; greyed out if unauthorized */}
          <button
            type="button"
            onClick={() => canModify && onEdit(item)}
            disabled={!canModify}
            className={`w-full max-w-[62px] inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border transition-all ${
              canModify
                ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-fotoblue-50 dark:hover:bg-fotoblue-950/40 hover:text-fotoblue-700 dark:hover:text-fotoblue-300 hover:border-fotoblue-300 dark:hover:border-fotoblue-800 shadow-2xs active:scale-95 cursor-pointer'
                : 'bg-slate-50 dark:bg-slate-800/20 text-slate-400 dark:text-slate-600 border-slate-200/50 dark:border-slate-800 opacity-40 cursor-not-allowed select-none'
            }`}
            title={
              canModify
                ? 'Edit interaction'
                : `Edit locked: Only ${agentLabel} or a Team Lead can edit this log.`
            }
            aria-label={canModify ? 'Edit interaction' : 'Edit locked'}
          >
            <Edit2 className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Edit</span>
          </button>

          {/* Delete Button - Active for author or Team Lead; greyed out if unauthorized */}
          <button
            type="button"
            onClick={() => canModify && onDelete(item)}
            disabled={!canModify}
            className={`w-full max-w-[62px] inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border transition-all ${
              canModify
                ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-300 dark:hover:border-rose-800 shadow-2xs active:scale-95 cursor-pointer'
                : 'bg-slate-50 dark:bg-slate-800/20 text-slate-400 dark:text-slate-600 border-slate-200/50 dark:border-slate-800 opacity-40 cursor-not-allowed select-none'
            }`}
            title={
              canModify
                ? 'Delete interaction'
                : `Delete locked: Only ${agentLabel} or a Team Lead can delete this log.`
            }
            aria-label={canModify ? 'Delete interaction' : 'Delete locked'}
          >
            <Trash2 className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
});
