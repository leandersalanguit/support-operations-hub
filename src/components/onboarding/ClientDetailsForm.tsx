/**
 * @file ClientDetailsForm.tsx
 * @description Form capturing client profile details, CRM autocomplete, product,
 * client timezone selector with quick-select chips, and notes.
 */

import React from 'react';
import { User, Phone, Package, Globe } from 'lucide-react';
import { ClientProfile } from '../../types';
import { OnboardingSlot } from '../../domain/onboarding/types';
import { CLIENT_PRODUCTS } from '../../domain/interaction/types';
import { COMMON_CLIENT_TIMEZONES } from '../../domain/onboarding/timezone';

interface ClientDetailsFormProps {
  selectedSlot: OnboardingSlot | null;
  clientName: string;
  setClientName: (val: string) => void;
  clientPhone: string;
  setClientPhone: (val: string) => void;
  product: string;
  setProduct: (val: string) => void;
  clientTimezone: string;
  setClientTimezone: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  clientSuggestions: ClientProfile[];
  selectClient: (client: ClientProfile) => void;
}

export const ClientDetailsForm: React.FC<ClientDetailsFormProps> = ({
  selectedSlot,
  clientName,
  setClientName,
  clientPhone,
  setClientPhone,
  product,
  setProduct,
  clientTimezone,
  setClientTimezone,
  notes,
  setNotes,
  clientSuggestions,
  selectClient,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          3. Client Details & Timezone
        </h2>
        {selectedSlot && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-fotoblue-50 dark:bg-fotoblue-950 text-fotoblue-700 dark:text-fotoblue-300 border border-fotoblue-200 dark:border-fotoblue-800">
            Target Slot: {selectedSlot.label} PHT
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Client Name with CRM Autocomplete */}
        <div className="relative">
          <label
            htmlFor="client-name-input"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Client Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="client-name-input"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Search or enter client..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500"
            />
          </div>

          {/* Autocomplete dropdown suggestions */}
          {clientSuggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
              {clientSuggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectClient(c)}
                  className="w-full text-left px-3 py-2 hover:bg-fotoblue-50 dark:hover:bg-slate-700/80 transition-colors flex items-center justify-between text-xs cursor-pointer"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {c.name}
                  </span>
                  {c.phoneNumbers && c.phoneNumbers[0] && (
                    <span className="text-[11px] text-slate-400">
                      {c.phoneNumbers[0]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Client Phone */}
        <div>
          <label
            htmlFor="client-phone-input"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Client Phone Number
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="client-phone-input"
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="e.g. +1 (555) 123-4567"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500"
            />
          </div>
        </div>

        {/* Product Selector */}
        <div>
          <label
            htmlFor="product-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Product <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Package className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="product-select"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 cursor-pointer"
            >
              <option value="">Select a product...</option>
              {CLIENT_PRODUCTS.map((prod) => (
                <option key={prod} value={prod}>
                  {prod}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Client Timezone Selector */}
        <div>
          <label
            htmlFor="timezone-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Client Timezone <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="timezone-select"
              value={clientTimezone}
              onChange={(e) => setClientTimezone(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 cursor-pointer"
            >
              {COMMON_CLIENT_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick Timezone Select Chips */}
      <div className="pt-2">
        <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
          Quick Timezone Select:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'Pacific', val: 'America/Los_Angeles' },
            { label: 'Eastern', val: 'America/New_York' },
            { label: 'Central', val: 'America/Chicago' },
            { label: 'Mountain', val: 'America/Denver' },
            { label: 'London (GMT)', val: 'Europe/London' },
            { label: 'Sydney', val: 'Australia/Sydney' },
            { label: 'Singapore', val: 'Asia/Singapore' },
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => setClientTimezone(item.val)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                clientTimezone === item.val
                  ? 'bg-fotoblue-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Notes */}
      <div className="pt-1">
        <label
          htmlFor="notes-input"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
        >
          Internal Session Notes (Optional)
        </label>
        <input
          id="notes-input"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Needs multi-monitor setup assistance"
          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500"
        />
      </div>
    </div>
  );
};
