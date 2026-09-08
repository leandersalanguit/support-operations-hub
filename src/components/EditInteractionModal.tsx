/**
 * @file EditInteractionModal.tsx
 * @description A full-screen modal component for editing an existing interaction log entry.
 * Pre-populates fields based on the selected interaction and allows the user to update
 * details, perform validations, and save changes.
 */

import React, { useState, useEffect } from 'react';
import {
  Interaction,
  ChannelType,
  StatusType,
  ClientRecord,
  SupportLicense,
} from '../types';
import { getDayOfWeekFromDate, getTodayDateString } from '../utils/date';
import { formatAgentDisplayName, validatePhoneNumber } from '../domain';
import { useTaxonomies, useClientMatch } from '../application';
import { getHelpdeskName } from '../utils/helpdesk';
import { formatChannelDetailsForSubmit } from '../utils/channelDetails';
import {
  ClientAutocompleteInput,
  ProductSelector,
  ClassificationSelector,
  StatusSelector,
  PhoneNumberField,
  LicenseSelector,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  handleFormEnterKeyNavigation,
} from './common';
import {
  Save,
  Calendar,
  User,
  Phone,
  MessageSquare,
  FileText,
  AlertCircle,
  ShieldCheck,
  Zap,
  Sparkles,
} from 'lucide-react';

/**
 * Props for the EditInteractionModal component.
 */
interface EditInteractionModalProps {
  /** The interaction object to edit. If null, the modal has nothing to edit. */
  interaction: Interaction | null;
  /** Currently authenticated agent name performing the edit */
  currentAgentName?: string;
  /** List of known clients for product & phone auto-lookup */
  clients?: ClientRecord[];
  /** Historical interactions list to discover past phone numbers for this client */
  interactions?: Interaction[];
  /** Boolean indicating whether the modal is currently open and visible. */
  isOpen: boolean;
  /** Callback function to handle closing the modal without saving. */
  onClose: () => void;
  /** Callback function triggered when valid changes are saved. Passes back the updated interaction. */
  onSave: (updated: Interaction) => void;
}

/**
 * Represents validation error messages for the edit form fields.
 */
interface EditErrors {
  /** Error message for the date field. */
  date?: string;
  /** Error message for the agent field. */
  agent?: string;
  /** Error message for the client name field. */
  clientName?: string;
  /** Error message for the channel details (phone/ticket) field. */
  channelDetails?: string;
  /** Error message for the client product field. */
  clientProduct?: string;
  /** Error message for the case classification field. */
  caseClassification?: string;
  /** Error message for the status field. */
  status?: string;
  /** Error message for the additional notes field. */
  additionalNotes?: string;
}

/**
 * A modal component for editing an existing interaction.
 *
 * @param {EditInteractionModalProps} props - The properties for the component.
 * @returns {JSX.Element | null} The rendered modal or null if not open or no interaction provided.
 */
export const EditInteractionModal: React.FC<EditInteractionModalProps> = React.memo(({
  interaction,
  currentAgentName,
  clients,
  interactions,
  isOpen,
  onClose,
  onSave,
}) => {
  // Form state variables
  const [date, setDate] = useState<string>(''); // The date of the interaction
  const [dayOfWeek, setDayOfWeek] = useState<string>(''); // Derived day of the week based on the selected date
  const [agent, setAgent] = useState<string>(''); // The name of the agent who handled the interaction
  const { products, classifications, supportTiers } = useTaxonomies();
  const helpdeskName = getHelpdeskName();
  const [clientName, setClientName] = useState<string>(''); // The name of the client
  const [channel, setChannel] = useState<ChannelType>('Call'); // The communication channel ('Call' or 'Chat')
  const [channelDetails, setChannelDetails] = useState<string>(''); // Specific details for the channel (e.g., phone number or ticket ID)
  const [clientProduct, setClientProduct] = useState<string>(''); // The related product
  const [caseClassification, setCaseClassification] = useState<string>(''); // Case classification category
  const [status, setStatus] = useState<StatusType | ''>(''); // The current status of the interaction

  // Matched client lookup & phone numbers via shared deduplicated hook
  const { matchedClient, clientPhoneNumbers } = useClientMatch(clientName, clients, interactions);
  
  // Boolean flags, not nullable since editing an existing interaction guarantees a value
  const [license, setLicense] = useState<SupportLicense>('support_active'); // Support license state
  const [inEvent, setInEvent] = useState<boolean>(false); // Indicates if the interaction occurred during an event
  const [firstTimeUser, setFirstTimeUser] = useState<boolean>(false); // Indicates if this is a first-time user
  
  const [additionalNotes, setAdditionalNotes] = useState<string>(''); // Additional notes regarding the interaction

  // State to track form validation errors
  const [errors, setErrors] = useState<EditErrors>({});
  // State to track if the user has attempted to submit the form
  const [submittedAttempt, setSubmittedAttempt] = useState<boolean>(false);

  /**
   * Syncs the component state with the incoming interaction prop when the modal opens or the interaction changes.
   * This pre-populates all form fields with existing interaction data.
   */
  useEffect(() => {
    if (interaction) {
      setDate(interaction.date);
      setDayOfWeek(interaction.dayOfWeek || getDayOfWeekFromDate(interaction.date));
      setAgent(formatAgentDisplayName(interaction.agent) || interaction.agent);
      setClientName(interaction.clientName);
      setChannel(interaction.channel);
      setChannelDetails(interaction.channelDetails);
      setClientProduct(interaction.clientProduct);
      setCaseClassification(interaction.caseClassification);
      setStatus(interaction.status);
      setLicense(interaction.license || 'support_active');
      setInEvent(interaction.inEvent);
      setFirstTimeUser(interaction.firstTimeUser);
      setAdditionalNotes((interaction.additionalNotes || '').trim());
      
      // Reset validation state on new interaction
      setErrors({});
      setSubmittedAttempt(false);
    }
  }, [interaction]);

  const handleSelectClientSuggestion = (client: ClientRecord) => {
    setClientName(client.name);
    if (errors.clientName) setErrors((prev) => ({ ...prev, clientName: undefined }));

    // Auto fill phone if on call
    const phone = (client.phoneNumbers && client.phoneNumbers[0]) || client.phoneNumber;
    if (channel === 'Call' && phone) {
      setChannelDetails(phone);
      if (errors.channelDetails) setErrors((prev) => ({ ...prev, channelDetails: undefined }));
    }
    // Auto select primary product
    if (client.ownedProducts && client.ownedProducts.length > 0) {
      setClientProduct(client.ownedProducts[0]);
      if (errors.clientProduct) setErrors((prev) => ({ ...prev, clientProduct: undefined }));
    }
  };

  // If the modal shouldn't be rendered, return null early
  if (!isOpen || !interaction) return null;

  /**
   * Handles changes to the date input field.
   * Automatically updates the day of the week based on the selected date.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   */
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const today = getTodayDateString();
    if (newDate && newDate > today) {
      setDate(today);
      setDayOfWeek(getDayOfWeekFromDate(today));
      if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
      return;
    }
    setDate(newDate);
    // Recalculate day of week when date changes
    setDayOfWeek(getDayOfWeekFromDate(newDate));
    // Clear date error if user modifies the date field
    if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
  };

  /**
   * Validates all form fields before saving.
   * Checks for required values and specific channel requirements.
   *
   * @returns {boolean} True if all validations pass, false otherwise.
   */
  const validate = (): boolean => {
    const newErrors: EditErrors = {};
    const today = getTodayDateString();

    // Validate required text/selection fields
    if (!date.trim()) {
      newErrors.date = 'Date is required';
    } else if (date > today) {
      newErrors.date = 'Future dates are not allowed';
    }
    if (!agent.trim()) {
      newErrors.agent = 'Agent name is required';
    }
    if (!clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }
    
    // Channel-specific validation
    if (channel === 'Call') {
      const res = validatePhoneNumber(channelDetails);
      if (!res.isValid) {
        newErrors.channelDetails = res.error;
      }
    }
    
    // Validate dropdown selections
    if (!clientProduct) {
      newErrors.clientProduct = 'Product is required';
    }
    if (!caseClassification) {
      newErrors.caseClassification = 'Classification is required';
    }
    if (!status) {
      newErrors.status = 'Status is required';
    }
    
    // Validate text area
    if (!additionalNotes.trim()) {
      newErrors.additionalNotes = 'Additional notes are required';
    }

    setErrors(newErrors);
    // Form is valid if no keys exist in the newErrors object
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission to save edited changes.
   * Validates the form and, if successful, creates the updated interaction object
   * to pass back via the onSave callback.
   *
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission reload
    setSubmittedAttempt(true); // Mark that a submission attempt was made to show errors

    // Stop early if validation fails
    if (!validate()) {
      return;
    }

    const formattedAgent = formatAgentDisplayName(agent) || agent.trim();
    const formattedModifier = currentAgentName ? (formatAgentDisplayName(currentAgentName) || currentAgentName) : interaction.lastModifiedBy;

    // Spread the original interaction to preserve non-editable fields (like id, createdAt, time),
    // and overwrite with updated values from form state
    onSave({
      ...interaction,
      date,
      dayOfWeek: dayOfWeek || getDayOfWeekFromDate(date),
      agent: formattedAgent,
      clientName: clientName.trim(),
      channel,
      channelDetails: formatChannelDetailsForSubmit(channel, channelDetails, helpdeskName),
      clientProduct,
      caseClassification,
      status: status as StatusType,
      license,
      inEvent,
      firstTimeUser,
      additionalNotes: additionalNotes.trim(),
      lastModifiedBy: formattedModifier,
      lastModifiedAt: new Date().toISOString(),
    });
    
    // Close the modal after a successful save
    onClose();
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    handleFormEnterKeyNavigation(e, () => {
      handleSave(e as any);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="3xl">
      {/* Header - Support Operations Branded */}
      <ModalHeader
        title="Edit Interaction"
        subtitle={
          currentAgentName ? `Editing as ${currentAgentName}` : 'Update support log details'
        }
        showAppLogo
        onClose={onClose}
      />

      {/* Global validation error banner */}
      {submittedAttempt && Object.keys(errors).length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-300 shrink-0">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>Please complete all required fields below.</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} onKeyDown={handleFormKeyDown} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <ModalBody className="space-y-5">
          {/* Row 1: Date & Day, Agent, Client Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                  <span>Date & Day</span>
                </span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <div
                className={`flex rounded-xl border bg-white dark:bg-slate-800 overflow-hidden ${
                  errors.date ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                <input
                  type="date"
                  required
                  max={getTodayDateString()}
                  value={date}
                  onChange={handleDateChange}
                  className="w-1/2 px-2.5 py-1.5 text-sm text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none"
                />
                <div className="w-1/2 px-2.5 py-1.5 text-xs font-bold text-fotoblue-900 dark:text-fotoblue-200 bg-fotoblue-50/60 dark:bg-fotoblue-950/40 border-l border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  {dayOfWeek}
                </div>
              </div>
              {errors.date && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <User className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                  <span>Agent</span>
                </span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                value={agent}
                onChange={(e) => {
                  setAgent(e.target.value);
                  if (errors.agent) setErrors((prev) => ({ ...prev, agent: undefined }));
                }}
                className={`w-full px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border rounded-xl focus:outline-none ${
                  errors.agent
                    ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-fotoblue-500'
                }`}
              />
              {errors.agent && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">{errors.agent}</p>}
            </div>

            <ClientAutocompleteInput
              value={clientName}
              onChange={(val) => {
                setClientName(val);
                if (errors.clientName) setErrors((prev) => ({ ...prev, clientName: undefined }));
              }}
              onSelectClient={handleSelectClientSuggestion}
              clients={clients as any}
              error={errors.clientName}
              showKnownBadge={false}
              compact
            />
          </div>

          {/* Row 2: Channel & Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Channel</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-200/70 dark:bg-slate-900/90 border border-slate-300/40 dark:border-slate-700/80 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setChannel('Call');
                    // Smart behavior: clear ticket value when switching back to Call
                    if (
                      channelDetails === helpdeskName ||
                      channelDetails.toLowerCase().startsWith(helpdeskName.toLowerCase()) ||
                      channelDetails.toLowerCase().startsWith('ticket') ||
                      channelDetails.startsWith('#') ||
                      !/^\+?[\d\s\-()./]+$/.test(channelDetails)
                    ) {
                      setChannelDetails('');
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    channel === 'Call' ? 'bg-white dark:bg-slate-800 text-fotoblue-700 dark:text-fotoblue-300 shadow-xs border border-slate-200/60 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" /> Call
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChannel('Chat');
                    // Smart behavior: auto-fill default helpdesk name when switching to Chat if details are empty
                    if (!channelDetails) {
                      setChannelDetails(helpdeskName);
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    channel === 'Chat' ? 'bg-white dark:bg-slate-800 text-fotodeep-600 dark:text-fotodeep-300 shadow-xs border border-slate-200/60 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-fotodeep-500 dark:text-fotodeep-400" /> Chat
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Channel Details ({channel === 'Chat' ? `${helpdeskName} (Optional)` : 'Phone'})</span>
                {channel === 'Call' && <span className="text-rose-500 font-bold">*</span>}
              </label>

              {channel === 'Call' ? (
                <PhoneNumberField
                  value={channelDetails}
                  onChange={(val) => {
                    setChannelDetails(val);
                    if (errors.channelDetails) setErrors((prev) => ({ ...prev, channelDetails: undefined }));
                  }}
                  onStartNewNumber={() => {
                    if (errors.channelDetails) setErrors((prev) => ({ ...prev, channelDetails: undefined }));
                  }}
                  matchedClient={matchedClient as any}
                  clientPhoneNumbers={clientPhoneNumbers}
                  error={errors.channelDetails}
                />
              ) : (
                <div>
                  <input
                    type="text"
                    value={channelDetails}
                    onChange={(e) => {
                      setChannelDetails(e.target.value);
                      if (errors.channelDetails) setErrors((prev) => ({ ...prev, channelDetails: undefined }));
                    }}
                    placeholder={`Ticket ID or Link (Optional - defaults to '${helpdeskName}')`}
                    className={`w-full px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border rounded-xl focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                      errors.channelDetails
                        ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-fotoblue-500'
                    }`}
                  />
                  {errors.channelDetails && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">{errors.channelDetails}</p>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Defaults to <strong>{helpdeskName}</strong> if left blank.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Product, Classification, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProductSelector
              value={clientProduct}
              onChange={(val) => {
                setClientProduct(val);
                if (errors.clientProduct) setErrors((prev) => ({ ...prev, clientProduct: undefined }));
              }}
              products={products}
              matchedClient={matchedClient as any}
              error={errors.clientProduct}
            />

            <ClassificationSelector
              value={caseClassification}
              onChange={(val) => {
                setCaseClassification(val);
                if (errors.caseClassification)
                  setErrors((prev) => ({ ...prev, caseClassification: undefined }));
              }}
              classifications={classifications}
              error={errors.caseClassification}
            />

            <StatusSelector
              value={status}
              onChange={(val) => {
                setStatus(val as StatusType);
                if (errors.status) setErrors((prev) => ({ ...prev, status: undefined }));
              }}
              error={errors.status}
              label="Status"
            />
          </div>

          {/* UNIFIED SECTION: Additional Details (Flags + Notes) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Additional Details
              </span>
              <span className="text-xs font-semibold text-rose-500">* All required</span>
            </div>

            {/* Flags */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Common LicenseSelector */}
              <LicenseSelector
                license={license}
                supportTiers={supportTiers}
                onChangeLicense={(val) => setLicense(val)}
                compact
              />

              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">In Event *</span>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-700/70 p-0.5 rounded text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setInEvent(true)}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      inEvent ? 'bg-fotoblue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setInEvent(false)}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      !inEvent ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">1st Time *</span>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-700/70 p-0.5 rounded text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFirstTimeUser(true)}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      firstTimeUser ? 'bg-fotoblue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFirstTimeUser(false)}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      !firstTimeUser ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                  <span>Additional Notes</span>
                </span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={additionalNotes}
                onChange={(e) => {
                  setAdditionalNotes(e.target.value);
                  if (errors.additionalNotes) setErrors((prev) => ({ ...prev, additionalNotes: undefined }));
                }}
                className={`w-full px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border rounded-xl focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                  errors.additionalNotes
                    ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-fotoblue-500'
                }`}
              />
              {errors.additionalNotes && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">{errors.additionalNotes}</p>
              )}
            </div>

            {/* Read-Only Audit & Verification Info (Immutable outside editable fields) */}
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
          </div>

        </ModalBody>

        {/* Actions - Pinned Modal Footer */}
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-fotoblue-500 to-fotodeep-500 hover:from-fotoblue-600 hover:to-fotodeep-600 dark:bg-none dark:bg-fotoblue-600 dark:hover:bg-fotoblue-500 text-white font-bold text-xs rounded-xl shadow-sm dark:shadow-fotoblue-950/60 dark:border dark:border-fotoblue-400/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
});
