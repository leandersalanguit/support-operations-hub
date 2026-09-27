/**
 * @file AddProductModal.tsx
 * @description Administrative modal for adding a new product to the system catalog
 * with duplicate checking and input sanitization.
 */

import React, { useState, useEffect } from 'react';
import { PlusCircle, AlertTriangle, Loader2 } from 'lucide-react';
import {
  validateCatalogProductName,
  sanitizeCatalogProductName,
} from '../../domain/catalog/validation';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../common/Modal';

export interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProductNames: string[];
  onAdd: (name: string) => Promise<void>;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  existingProductNames,
  onAdd,
}) => {
  const [name, setName] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setValidationError(null);
      setSubmitError(null);
    }
  }, [isOpen]);

  const sanitized = sanitizeCatalogProductName(name);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSubmitError(null);

    const check = validateCatalogProductName(val, existingProductNames);
    if (!check.isValid) {
      setValidationError(check.error || 'Invalid product name.');
      return;
    }

    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const check = validateCatalogProductName(name, existingProductNames);
    if (!check.isValid) {
      setValidationError(check.error || 'Invalid product name.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onAdd(sanitized);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to add product to catalog.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    !validationError && sanitized.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <ModalHeader
          title="Add New Catalog Product"
          subtitle="Define a new equipment or software product for client assignments and logs"
          icon={<PlusCircle className="w-5 h-5 text-fotoblue-600 dark:text-fotoblue-400" />}
          onClose={onClose}
        />

        <ModalBody className="space-y-4">
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="product-name"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="product-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. 360 Booth Series 2"
              disabled={isSubmitting}
              autoFocus
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus:outline-hidden focus:ring-2 ${
                validationError
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/30'
                  : 'border-slate-300 dark:border-slate-700 focus:border-fotoblue-500 focus:ring-fotoblue-500/20'
              }`}
            />
            {validationError ? (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1">
                {validationError}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                New products are immediately available in the Client Directory and Support logging forms.
              </p>
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
                <span>Creating Product...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </>
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
