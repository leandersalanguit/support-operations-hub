/**
 * @file DeleteConfirmModal.tsx
 * @description Confirmation dialog component for deleting an interaction log.
 * Displays interaction summary details and prompts user confirmation before deletion.
 */

import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Interaction } from '../types';
import { formatAgentDisplayName } from '../domain';
import { Modal, ModalHeader, ModalBody } from './common';

/**
 * Props for the DeleteConfirmModal component.
 */
export interface DeleteConfirmModalProps {
  /** The interaction to be deleted. Null if no interaction is currently selected for deletion. */
  interaction: Interaction | null;
  /** Boolean flag controlling whether the modal is open and visible. */
  isOpen: boolean;
  /** Callback fired to close the modal without deleting. */
  onClose: () => void;
  /** Callback fired to confirm the deletion action. */
  onConfirm: () => void;
}

/**
 * Modal component that prompts the user to confirm the deletion of a specific interaction log.
 * Provides a summary of the item being deleted.
 */
export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = React.memo(({
  interaction,
  isOpen,
  onClose,
  onConfirm,
}) => {
  // Do not render anything if modal is closed or no interaction is provided
  if (!isOpen || !interaction) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      {/* Branded Header */}
      <ModalHeader
        title="Delete Interaction Log"
        subtitle="Confirm log removal"
        showAppLogo
        onClose={onClose}
      />

      <ModalBody className="p-6">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Are you sure you want to delete this log?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              This action cannot be undone and will remove it from the shift record.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 mb-5 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Client:</span>
            <span className="font-bold text-slate-900 dark:text-white">{interaction.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Agent:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {formatAgentDisplayName(interaction.agent) || interaction.agent}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Product:</span>
            <span className="px-2 py-0.5 bg-fotoblue-50 dark:bg-fotoblue-950/60 text-fotoblue-800 dark:text-fotoblue-200 border border-fotoblue-200 dark:border-fotoblue-800 rounded font-bold text-[11px]">
              {interaction.clientProduct}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Date:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {interaction.date} ({interaction.dayOfWeek})
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Log</span>
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
});
