/**
 * @file EditResourceModal.tsx
 * @description Accessible modal for editing visible table fields for an existing resource entry
 * (Case Classifications, Installers, Marketing Folders, Quick Start Guides, Recommended Hardware, Manuals).
 * Strictly restricts editable fields to only those visible on the tables.
 */

import React, { useState, useEffect } from 'react';
import { Edit2, Loader2, AlertCircle, Check, Plus } from 'lucide-react';
import { AdminResourceConfig, ResourceFieldDefinition } from '../../utils/adminResourceConfig';
import { validateResourcePayload } from '../../utils/adminFormValidation';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../common/Modal';

export interface EditResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AdminResourceConfig;
  item: any | null;
  dynamicCategories?: string[];
  onEdit: (id: string, values: Record<string, any>, originalItem: any) => Promise<void>;
}

export const EditResourceModal: React.FC<EditResourceModalProps> = ({
  isOpen,
  onClose,
  config,
  item,
  dynamicCategories = [],
  onEdit,
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Custom tag creation
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && item) {
      const initial: Record<string, any> = {};
      config.fields.forEach((field) => {
        if (field.type === 'tags') {
          initial[field.key] = Array.isArray(item[field.key])
            ? item[field.key]
            : item.category
            ? [item.category]
            : [];
        } else {
          initial[field.key] = item[field.key] ?? '';
        }
      });
      setFormValues(initial);
      setFieldErrors({});
      setSubmitError(null);
      setCustomTagInput('');

      // Merge dynamic categories from DB with item's existing tags and config options
      const itemTags = Array.isArray(item.categories) ? item.categories : item.category ? [item.category] : [];
      const merged = Array.from(
        new Set([
          ...dynamicCategories,
          ...(config.categoryOptions || []),
          ...itemTags,
        ].filter(Boolean))
      ).sort();
      setAvailableTags(merged);
    }
  }, [isOpen, item, config, dynamicCategories]);

  if (!isOpen || !item) return null;

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

  const handleAddCustomTag = (fieldKey: string) => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;

    if (!availableTags.includes(trimmed)) {
      setAvailableTags((prev) => [...prev, trimmed].sort());
    }

    const currentTags = Array.isArray(formValues[fieldKey]) ? formValues[fieldKey] : [];
    if (!currentTags.includes(trimmed)) {
      handleChange(fieldKey, [...currentTags, trimmed]);
    }
    setCustomTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const { isValid, errors } = validateResourcePayload(config, formValues);
    if (!isValid) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onEdit(item.id, formValues, item);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || `Failed to update ${config.singular.toLowerCase()}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: ResourceFieldDefinition) => {
    const error = fieldErrors[field.key];
    const value = formValues[field.key] ?? '';
    const inputId = `edit-field-${field.key}`;
    const errorId = `${inputId}-error`;
    const helpId = `${inputId}-help`;

    return (
      <div key={field.key} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <span>{field.label}</span>
            {field.required ? (
              <span className="text-rose-500 font-bold" title="Required field">*</span>
            ) : (
              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">(optional)</span>
            )}
          </label>
          {field.helpText && (
            <span id={helpId} className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
              {field.helpText}
            </span>
          )}
        </div>

        {field.type === 'textarea' ? (
          <textarea
            id={inputId}
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            aria-required={field.required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : field.helpText ? helpId : undefined}
            className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
              error
                ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-700 focus:ring-fotoblue-500/20'
            }`}
          />
        ) : field.type === 'select' ? (
          <select
            id={inputId}
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            aria-required={field.required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : field.helpText ? helpId : undefined}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500/20 transition-all cursor-pointer"
          >
            <option value="">-- Select {field.label} (Optional) --</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : field.type === 'tags' ? (
          <div className="space-y-2">
            <div
              id={inputId}
              role="group"
              aria-label={field.label}
              className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 min-h-[42px]"
            >
              {availableTags.length === 0 ? (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 italic p-1">
                  No existing categories found. Type below to create one.
                </span>
              ) : (
                availableTags.map((tag) => {
                  const selected = Array.isArray(value) && value.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(field.key, tag)}
                      aria-pressed={selected}
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
                })
              )}
            </div>

            {/* Inline Add New Tag input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag(field.key);
                  }
                }}
                placeholder="Add custom tag/category..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-fotoblue-500"
              />
              <button
                type="button"
                onClick={() => handleAddCustomTag(field.key)}
                disabled={!customTagInput.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        ) : (
          <input
            id={inputId}
            type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            aria-required={field.required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : field.helpText ? helpId : undefined}
            className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
              error
                ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-700 focus:ring-fotoblue-500/20'
            }`}
          />
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1"
          >
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  };

  const Icon = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" ariaLabelledBy="edit-resource-modal-title">
      <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
        <ModalHeader
          title={`Edit ${config.singular}`}
          subtitle={`Update visible details for "${item.name}". Only visible table attributes are editable.`}
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
                <Edit2 className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
