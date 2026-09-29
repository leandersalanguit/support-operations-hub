/**
 * @file RenameResourceModal.tsx
 * @description Administrative modal for renaming entries in support operational resource catalogs
 * (Case Classifications, Installers, Marketing Folders, Quick Start Guides, Recommended Hardware, Manuals).
 */

import React, { useState, useEffect } from 'react';
import { Edit2, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { AdminResourceConfig } from '../../utils/adminResourceConfig';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../common/Modal';

export interface RenameResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AdminResourceConfig;
  item: any | null;
  onRename: (id: string, oldName: string, newName: string) => Promise<void>;
}

export const RenameResourceModal: React.FC<RenameResourceModalProps> = ({
  isOpen,
  onClose,
  config,
  item,
  onRename,
}) => {
  const [newName, setNewName] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setNewName(item.name || '');
      setValidationError(null);
      setSubmitError(null);
    }
  }, [isOpen, item]);

  if (!item) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewName(val);
    setSubmitError(null);

    const trimmed = val.trim();
    if (!trimmed) {
      setValidationError(`${config.singular} name cannot be empty.`);
    } else if (trimmed.toLowerCase() === item.name.trim().toLowerCase()) {
      setValidationError(`New name must differ from the current name.`);
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();

    if (!trimmed) {
      setValidationError(`${config.singular} name cannot be empty.`);
      return;
    }
    if (trimmed.toLowerCase() === item.name.trim().toLowerCase()) {
      setValidationError(`New name must differ from the current name.`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onRename(item.id, item.name, trimmed);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || `Failed to rename ${config.singular.toLowerCase()}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" ariaLabelledBy="rename-resource-title">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <ModalHeader
          title={`Rename ${config.singular}`}
          subtitle={`Update name and maintain audit log trail in ${config.title}`}
          icon={<Edit2 className="w-5 h-5 text-fotoblue-600 dark:text-fotoblue-400" />}
          onClose={onClose}
        />

        <ModalBody className="space-y-4 p-6">
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Current Name Card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Current Name
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {item.name}
            </span>
          </div>

          {/* New Name Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="rename-resource-input"
              className="text-xs font-bold text-slate-800 dark:text-slate-200 block"
            >
              New {config.singular} Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="rename-resource-input"
              type="text"
              value={newName}
              onChange={handleNameChange}
              placeholder={`Enter new name for ${item.name}...`}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'rename-resource-error' : undefined}
              className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                validationError
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-fotoblue-500/20'
              }`}
            />
            {validationError && (
              <p
                id="rename-resource-error"
                role="alert"
                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1"
              >
                <AlertCircle className="w-3 h-3" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Preview Transformation */}
          {newName.trim() && !validationError && newName.trim() !== item.name && (
            <div className="p-3 rounded-xl bg-fotoblue-50/60 dark:bg-fotoblue-950/40 border border-fotoblue-100 dark:border-fotoblue-900 text-xs flex items-center gap-2">
              <span className="text-slate-400 line-through truncate max-w-[140px]">{item.name}</span>
              <ArrowRight className="w-3.5 h-3.5 text-fotoblue-500 shrink-0" />
              <span className="font-bold text-fotoblue-700 dark:text-fotoblue-300 truncate">
                {newName.trim()}
              </span>
            </div>
          )}
        </ModalBody>

        <ModalFooter className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !!validationError || !newName.trim() || newName.trim() === item.name}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-fotoblue-600 to-fotodeep-600 hover:from-fotoblue-700 hover:to-fotodeep-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                <span>Save Rename</span>
              </>
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
