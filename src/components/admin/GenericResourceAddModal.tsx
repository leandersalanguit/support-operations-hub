/**
 * @file GenericResourceAddModal.tsx
 * @description Schema-driven modal for adding new items to any administrative resource catalog.
 * Dynamically configures input fields, clearly marking minimal required fields (Name & Link)
 * and allowing other fields to remain optional.
 */

import React, { useState, useEffect } from 'react';
import { PlusCircle, Loader2, AlertCircle, Check } from 'lucide-react';
import { AdminResourceConfig, ResourceFieldDefinition } from '../../utils/adminResourceConfig';
import { validateResourcePayload } from '../../utils/adminFormValidation';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../common/Modal';

export interface GenericResourceAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AdminResourceConfig;
  onAdd: (values: Record<string, any>) => Promise<void>;
}

export const GenericResourceAddModal: React.FC<GenericResourceAddModalProps> = ({
  isOpen,
  onClose,
  config,
  onAdd,
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize or reset form defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, any> = {};
      config.fields.forEach((field) => {
        if (field.type === 'tags') {
          initial[field.key] = field.defaultValue || [];
        } else {
          initial[field.key] = field.defaultValue ?? '';
        }
      });
      setFormValues(initial);
      setFieldErrors({});
      setSubmitError(null);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleToggleTag = (key: string, tag: string) => {
    const currentTags = Array.isArray(formValues[key]) ? formValues[key] : [];
    const isSelected = currentTags.includes(tag);
    const updated = isSelected
      ? currentTags.filter((t: string) => t !== tag)
      : [...currentTags, tag];
    handleChange(key, updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate using pure /utils validator
    const { isValid, errors } = validateResourcePayload(config, formValues);
    if (!isValid) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onAdd(formValues);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || `Failed to add ${config.singular.toLowerCase()}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: ResourceFieldDefinition) => {
    const error = fieldErrors[field.key];
    const value = formValues[field.key] ?? '';

    return (
      <div key={field.key} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <span>{field.label}</span>
            {field.required ? (
              <span className="text-rose-500 font-bold" title="Required field">*</span>
            ) : (
              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">(optional)</span>
            )}
          </label>
          {field.helpText && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
              {field.helpText}
            </span>
          )}
        </div>

        {field.type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
              error
                ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-700 focus:ring-fotoblue-500/20'
            }`}
          />
        ) : field.type === 'select' ? (
          <select
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500/20 transition-all cursor-pointer"
          >
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : field.type === 'tags' ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
              {(field.options || []).map((tag) => {
                const selected = Array.isArray(value) && value.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(field.key, tag)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selected
                        ? 'bg-fotoblue-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <input
            type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
              error
                ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-700 focus:ring-fotoblue-500/20'
            }`}
          />
        )}

        {error && (
          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  };

  const Icon = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
        <ModalHeader
          title={`Add ${config.singular}`}
          subtitle={`Create a new entry in ${config.title}. Minimal required fields are indicated.`}
          icon={<Icon className="w-5 h-5 text-fotoblue-600 dark:text-fotoblue-400" />}
          onClose={onClose}
        />

        <ModalBody className="space-y-4 flex-1 overflow-y-auto pr-1">
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="space-y-3.5">
            {config.fields.map(renderField)}
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
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-fotoblue-600 to-fotodeep-600 hover:from-fotoblue-700 hover:to-fotodeep-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Add {config.singular}</span>
              </>
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
