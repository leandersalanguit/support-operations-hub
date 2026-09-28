/**
 * @file RenameProductModal.tsx
 * @description Administrative modal for renaming a catalog product with live
 * validation and impact summary (affected clients, interaction logs, and resources).
 */

import React, { useState, useEffect } from 'react';
import { Tag, AlertTriangle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { CatalogProduct } from '../../domain/catalog/types';
import {
  validateCatalogProductName,
  sanitizeCatalogProductName,
} from '../../domain/catalog/validation';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../common/Modal';

export interface RenameProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CatalogProduct | null;
  onRename: (oldName: string, newName: string) => Promise<void>;
}

export const RenameProductModal: React.FC<RenameProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onRename,
}) => {
  const [newName, setNewName] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasConfirmedImpact, setHasConfirmedImpact] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && product) {
      setNewName(product.name);
      setValidationError(null);
      setSubmitError(null);
      setHasConfirmedImpact(false);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const sanitized = sanitizeCatalogProductName(newName);
  const isUnchanged = sanitized.toLowerCase() === product.name.trim().toLowerCase();
  const totalImpact = (product.clientCount || 0) + (product.interactionCount || 0);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewName(val);
    setSubmitError(null);

    const check = validateCatalogProductName(val);
    if (!check.isValid) {
      setValidationError(check.error || 'Invalid product name.');
    } else if (val.trim().toLowerCase() === product.name.trim().toLowerCase()) {
      setValidationError('New product name must differ from the current name.');
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const check = validateCatalogProductName(newName);
    if (!check.isValid) {
      setValidationError(check.error || 'Invalid product name.');
      return;
    }
    if (isUnchanged) {
      setValidationError('New product name must differ from the current name.');
      return;
    }

    if (totalImpact > 0 && !hasConfirmedImpact) {
      setValidationError('Please acknowledge the impact summary before proceeding.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onRename(product.name, sanitized);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to rename product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    !validationError &&
    sanitized.length > 0 &&
    !isUnchanged &&
    (totalImpact === 0 || hasConfirmedImpact);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <ModalHeader
          title="Rename Product"
          subtitle="Rename this product and atomically cascade changes across all CRM clients and logs"
          icon={<Tag className="w-5 h-5 text-fotoblue-600 dark:text-fotoblue-400" />}
          onClose={onClose}
        />

        <ModalBody className="space-y-4">
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Current vs New comparison */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Product Transformation
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                {product.name}
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <div className="flex-1 px-3 py-2 bg-fotoblue-50/60 dark:bg-fotoblue-950/40 border border-fotoblue-200 dark:border-fotoblue-800 rounded-lg text-xs font-semibold text-fotoblue-700 dark:text-fotoblue-300 truncate">
                {sanitized || '(Enter new name)'}
              </div>
            </div>
          </div>

          {/* Input field */}
          <div className="space-y-1.5">
            <label
              htmlFor="new-product-name"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              New Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-product-name"
              type="text"
              value={newName}
              onChange={handleNameChange}
              placeholder="e.g. Mirror X (2026)"
              disabled={isSubmitting}
              autoFocus
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus:outline-hidden focus:ring-2 ${
                validationError
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/30'
                  : 'border-slate-300 dark:border-slate-700 focus:border-fotoblue-500 focus:ring-fotoblue-500/20'
              }`}
            />
            {validationError && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1">
                {validationError}
              </p>
            )}
          </div>

          {/* Impact breakdown card */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/70 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Cascade Impact Scope</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  Client Directory
                </div>
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {product.clientCount ?? 0}
                  <span className="text-[10px] font-medium text-slate-400 ml-1">clients</span>
                </div>
              </div>
              <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  Historical Logs
                </div>
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {product.interactionCount ?? 0}
                  <span className="text-[10px] font-medium text-slate-400 ml-1">logs</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-300/90">
              Renaming executes a PostgreSQL atomic cascade across client owned products, support interaction history, onboarding sessions, and documentation tables.
            </p>

            {totalImpact > 0 && (
              <label className="flex items-start gap-2.5 pt-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasConfirmedImpact}
                  onChange={(e) => setHasConfirmedImpact(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-fotoblue-600 focus:ring-fotoblue-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  I understand this will update {totalImpact} associated records in real-time.
                </span>
              </label>
            )}
          </div>
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
            disabled={!isFormValid || isSubmitting}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-fotoblue-600 to-fotodeep-600 hover:from-fotoblue-700 hover:to-fotodeep-700 text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cascading Rename...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Cascade</span>
              </>
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
