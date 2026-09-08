/**
 * @file ClientFormModal.tsx
 * @description Dialog modal for creating or editing client records.
 * Manages client name, multiple phone numbers, and associated product ownership.
 */

import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, X, Check, Info } from 'lucide-react';
import { ClientRecord } from '../types';
import { useTaxonomies } from '../application';
import {
  formatAgentDisplayName,
  formatPhoneNumber,
  normalizeClientPhones,
  validatePhoneNumber,
  sanitizePhoneInput,
  didAppendUSCountryCode,
} from '../domain';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './common/Modal';
import { handleFormEnterKeyNavigation } from './common';

export interface ClientFormModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Invoked when modal is closed without saving */
  onClose: () => void;
  /** Existing client to edit, or null when adding a new client */
  client: ClientRecord | null;
  /** List of existing clients to prevent duplicate company names */
  existingClients: ClientRecord[];
  /** Currently logged in agent's name */
  currentAgentName?: string;
  /** Callback fired when client is saved (created or updated) */
  onSave: (savedClient: ClientRecord) => void;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  client,
  existingClients,
  currentAgentName,
  onSave,
}) => {
  const { products: catalogProducts } = useTaxonomies();
  const [name, setName] = useState('');
  const [phones, setPhones] = useState<string[]>([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [products, setProducts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDefaultCountryCodeNotice, setShowDefaultCountryCodeNotice] = useState(false);

  // Sync state on open / client change
  useEffect(() => {
    if (isOpen) {
      if (client) {
        setName(client.name);
        setPhones(normalizeClientPhones(client));
        setPhoneInput('');
        setProducts([...(client.ownedProducts || [])]);
      } else {
        setName('');
        setPhones([]);
        setPhoneInput('');
        setProducts([]);
      }
      setShowDefaultCountryCodeNotice(false);
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, client]);

  const handlePhoneChange = (val: string) => {
    const sanitized = sanitizePhoneInput(val);
    if (showDefaultCountryCodeNotice) {
      setShowDefaultCountryCodeNotice(false);
    }
    setPhoneInput(sanitized);
    if (error) setError(null);
  };

  const handlePhoneBlur = () => {
    const trimmed = phoneInput.trim();
    if (trimmed) {
      const sanitized = sanitizePhoneInput(trimmed);
      const formatted = formatPhoneNumber(sanitized);
      setShowDefaultCountryCodeNotice(didAppendUSCountryCode(trimmed, formatted));
      setPhoneInput(formatted);
    } else {
      setShowDefaultCountryCodeNotice(false);
    }
  };

  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      const sanitized = sanitizePhoneInput(text);
      const digits = sanitized.replace(/\D/g, '');
      if (digits.length >= 7) {
        e.preventDefault();
        const formatted = formatPhoneNumber(sanitized);
        setShowDefaultCountryCodeNotice(didAppendUSCountryCode(sanitized, formatted));
        setPhoneInput(formatted);
        if (error) setError(null);
      }
    }
  };

  const handleAddPhone = () => {
    const trimmed = phoneInput.trim();
    if (!trimmed) return;
    const res = validatePhoneNumber(trimmed);
    if (!res.isValid) {
      setError(res.error || 'Invalid phone number');
      return;
    }
    const formatted = formatPhoneNumber(sanitizePhoneInput(trimmed));
    setShowDefaultCountryCodeNotice(false);
    if (phones.includes(formatted)) {
      setPhoneInput('');
      setError(null);
      return;
    }
    setPhones([...phones, formatted]);
    setPhoneInput('');
    setError(null);
  };

  const handleRemovePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
  };

  const handleToggleProduct = (prod: string) => {
    if (products.includes(prod)) {
      setProducts(products.filter((p) => p !== prod));
    } else {
      setProducts([...products, prod]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Client name is required');
      return;
    }

    // Check for duplicate name if creating or changing name
    const existingDuplicate = existingClients.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase() && c.id !== client?.id
    );
    if (existingDuplicate) {
      setError(`A client with the name "${trimmedName}" already exists.`);
      return;
    }

    setIsSaving(true);
    setError(null);

    const now = new Date().toISOString();
    // Flush any pending text in phoneInput
    const finalPhones = [...phones];
    const pendingPhone = phoneInput.trim();
    if (pendingPhone) {
      const res = validatePhoneNumber(pendingPhone);
      if (!res.isValid) {
        setError(res.error || 'Invalid phone number');
        setIsSaving(false);
        return;
      }
      const formatted = formatPhoneNumber(sanitizePhoneInput(pendingPhone));
      if (!finalPhones.includes(formatted)) {
        finalPhones.push(formatted);
      }
    }

    try {
      if (client) {
        // Edit existing client
        const formattedAgent = currentAgentName
          ? formatAgentDisplayName(currentAgentName)
          : client.lastLoggedBy
          ? formatAgentDisplayName(client.lastLoggedBy)
          : undefined;

        const updatedClient: ClientRecord = {
          ...client,
          name: trimmedName,
          phoneNumbers: finalPhones,
          phoneNumber: finalPhones[0] || undefined,
          ownedProducts: products,
          updatedAt: now,
          lastLoggedBy: formattedAgent,
        };

        onSave(updatedClient);
      } else {
        // Create new client
        const formattedAgent = currentAgentName
          ? formatAgentDisplayName(currentAgentName)
          : undefined;

        const newClient: ClientRecord = {
          id: crypto.randomUUID(),
          name: trimmedName,
          phoneNumbers: finalPhones,
          phoneNumber: finalPhones[0] || undefined,
          ownedProducts: products,
          createdAt: now,
          updatedAt: now,
          lastLoggedBy: formattedAgent,
        };

        onSave(newClient);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save client');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    handleFormEnterKeyNavigation(e, () => {
      handleSubmit(e as any);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <ModalHeader
        title={client ? 'Edit Client Record' : 'Add New Client'}
        icon={<Users className="w-4 h-4" />}
        variant="clean"
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody className="space-y-4 p-6 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Client Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Client / Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dunder Mifflin / Jane Doe"
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Phone Numbers Management */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Numbers
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                inputMode="tel"
                value={phoneInput}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={handlePhoneBlur}
                onPaste={handlePhonePaste}
                onKeyDown={(e) => {
                  if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPhone();
                  }
                }}
                placeholder="Enter phone number (e.g. +1 555-0192)..."
                className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 text-slate-900 dark:text-slate-100 font-mono"
              />
              <button
                type="button"
                onClick={handleAddPhone}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Add
              </button>
            </div>
            {showDefaultCountryCodeNotice && (
              <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11px] leading-tight transition-all">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Defaulted to <strong>+1 (US/CA)</strong>. For other countries, include your country code prefix (e.g. <span className="font-mono font-semibold">+44</span>, <span className="font-mono font-semibold">+61</span>).
                </span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Auto-formats with country code (e.g. <span className="font-mono text-fotoblue-600 dark:text-fotoblue-400 font-semibold">+1 234 567 8901</span> or <span className="font-mono text-fotoblue-600 dark:text-fotoblue-400 font-semibold">+44 20 7946 0991</span>)
            </p>

            {phones.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {phones.map((phone, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <span className="font-mono text-slate-800 dark:text-slate-200">{phone}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePhone(idx)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5"
                      title="Remove number"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Owned Products Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Equipment Owned ({products.length})
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1.5 border border-slate-200 dark:border-slate-700 rounded-xl">
              {catalogProducts.map((prod) => {
                const isSelected = products.includes(prod);
                return (
                  <button
                    key={prod}
                    type="button"
                    onClick={() => handleToggleProduct(prod)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer border ${
                      isSelected
                        ? 'bg-fotoblue-50 dark:bg-fotoblue-950/60 border-fotoblue-400 text-fotoblue-900 dark:text-fotoblue-200 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-fotoblue-600 border-fotoblue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className="truncate">{prod}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-fotoblue-600 hover:bg-fotoblue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : client ? 'Save Changes' : 'Create Client'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
