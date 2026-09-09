/**
 * @file InteractionForm.tsx
 * @description Main input form component for logging new customer interactions using React Hook Form.
 * Handles state management, validation, and submission of interaction details.
 * Supports both a clean, spacious Vertical View and a compact Grid View with view persistence.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  ChannelType,
  StatusType,
  InteractionFormData,
  ClientRecord,
  Interaction,
  SupportLicense,
} from '../types';
import {
  getTodayDateString,
  getDayOfWeekFromDate,
  resolveInteractionTimestamp,
} from '../utils/date';
import { loadLastAgent, saveLastAgent, loadFormViewMode, saveFormViewMode } from '../utils/storage';
import { getHelpdeskName } from '../utils/helpdesk';
import { formatChannelDetailsForSubmit } from '../utils/channelDetails';
import { formatAgentDisplayName, UserRole, validatePhoneNumber } from '../domain';
import { useTaxonomies, useClientMatch } from '../application';
import { parseExcelRow, ParsedExcelRow } from '../utils/importParser';
import { readTextFromClipboard } from '../utils/clipboard';
import { PasteExcelModal } from './PasteExcelModal';
import {
  ClientAutocompleteInput,
  ProductSelector,
  ClassificationSelector,
  StatusSelector,
  PhoneNumberField,
  LicenseSelector,
  handleFormEnterKeyNavigation,
} from './common';
import {
  Phone,
  MessageSquare,
  PlusCircle,
  Calendar,
  User,
  Package,
  Zap,
  Sparkles,
  Check,
  FileText,
  AlertCircle,
  ClipboardList,
  ClipboardPaste,
  LayoutGrid,
  Rows3,
} from 'lucide-react';
import { AppLogo } from './AppLogo';

/**
 * Form field values managed by React Hook Form.
 */
export interface InteractionFormInputs {
  date: string;
  dayOfWeek: string;
  agent: string;
  clientName: string;
  channel: ChannelType;
  chatTicketDetail: string;
  phoneDetail: string;
  clientProduct: string;
  caseClassification: string;
  status: StatusType | '';
  license: SupportLicense;
  inEvent: boolean | null;
  firstTimeUser: boolean | null;
  additionalNotes: string;
}

/**
 * Props for the InteractionForm component.
 */
interface InteractionFormProps {
  /** Authenticated agent name */
  agentName?: string;
  /** Authenticated user role */
  userRole?: UserRole;
  /** Relational clients store with known products and phone numbers */
  clients?: ClientRecord[];
  /** Historical interactions list to discover past phone numbers for this client */
  interactions?: Interaction[];
  /** Callback triggered when a new interaction is successfully validated and submitted. */
  onAddInteraction: (data: InteractionFormData) => void;
  /** Optional callback triggered after successful form validation and submission. */
  onSubmitSuccess?: () => void;
}

/**
 * Returns default form field values.
 */
const getDefaultValues = (
  agentName?: string,
  defaultProduct = '',
  defaultClassification = ''
): InteractionFormInputs => {
  const initialDate = getTodayDateString();
  return {
    date: initialDate,
    dayOfWeek: getDayOfWeekFromDate(initialDate),
    agent: formatAgentDisplayName(agentName || loadLastAgent() || ''),
    clientName: '',
    channel: 'Call',
    chatTicketDetail: '',
    phoneDetail: '',
    clientProduct: defaultProduct || '',
    caseClassification: defaultClassification || '',
    status: 'Solved',
    license: 'support_active',
    inEvent: true,
    firstTimeUser: false,
    additionalNotes: '',
  };
};

/**
 * InteractionForm component.
 * Provides a comprehensive form for support agents to log interactions with clients.
 * Powered by React Hook Form for optimized state tracking and single-line form resets.
 * 
 * @param {InteractionFormProps} props - The component props.
 * @returns {JSX.Element} The rendered form component.
 */
export const InteractionForm: React.FC<InteractionFormProps> = React.memo(({
  agentName,
  userRole,
  clients,
  interactions,
  onAddInteraction,
  onSubmitSuccess,
}) => {
  // Dynamic taxonomies from database context
  const { products, classifications, supportTiers } = useTaxonomies();
  const helpdeskName = getHelpdeskName();

  // View layout mode ('vertical' for clear vertical form flow, 'grid' for compact multi-column layout)
  const [viewMode, setViewMode] = useState<'grid' | 'vertical'>(() => loadFormViewMode());
  // Success toast visibility and message
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [successToastMessage, setSuccessToastMessage] = useState<string>('Interaction Logged!');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Paste from Excel modal state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pasteModalInitialText, setPasteModalInitialText] = useState<string>('');

  // React Hook Form initialization
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    getValues,
    clearErrors,
    formState: { errors, isSubmitted },
  } = useForm<InteractionFormInputs>({
    defaultValues: getDefaultValues(agentName, products[0] || '', classifications[0] || ''),
    mode: 'onSubmit',
  });

  // Watch reactive fields needed for conditional UI rendering (consolidated at top level)
  const channel = watch('channel');
  const dayOfWeek = watch('dayOfWeek');
  const clientName = watch('clientName');

  // Match currently known client & phone numbers using shared deduplicated hook
  const { matchedClient, clientPhoneNumbers } = useClientMatch(clientName, clients, interactions);

  // Track whether the user has manually changed the product
  const userManuallySelectedProductRef = useRef<boolean>(false);
  // Suppress immediate empty phone error when user explicitly starts adding/changing a number
  const suppressPhoneEmptyErrorRef = useRef<boolean>(false);

  // Automatically select the default product (item 1 in the database or matched client's product)
  // and classification once fetched from the database
  useEffect(() => {
    if (products.length > 0) {
      const current = getValues('clientProduct');
      const defaultProduct = matchedClient?.ownedProducts?.[0] || products[0];
      if (!current || !userManuallySelectedProductRef.current) {
        if (defaultProduct && current !== defaultProduct) {
          setValue('clientProduct', defaultProduct, { shouldValidate: false });
        }
      }
    }
    if (classifications.length > 0) {
      const current = getValues('caseClassification');
      if (!current) {
        setValue('caseClassification', classifications[0], { shouldValidate: false });
      }
    }
  }, [products, classifications, matchedClient, setValue, getValues]);

  // Track the last matched client to avoid repeatedly resetting user edits
  const lastAutoFilledClientRef = useRef<string | null>(null);

  // When a known client is matched, auto-fill phone and select their primary product
  useEffect(() => {
    if (matchedClient) {
      if (lastAutoFilledClientRef.current !== matchedClient.id) {
        lastAutoFilledClientRef.current = matchedClient.id;

        // Auto-fill phone if available and currently on Call
        const initialPhone = clientPhoneNumbers[0] || matchedClient.phoneNumber;
        if (initialPhone) {
          setValue('phoneDetail', initialPhone, { shouldValidate: true });
        }
        // Auto-select client's first owned product if available
        if (matchedClient.ownedProducts && matchedClient.ownedProducts.length > 0) {
          setValue('clientProduct', matchedClient.ownedProducts[0], { shouldValidate: true });
        }
      }
    } else {
      lastAutoFilledClientRef.current = null;
    }
  }, [matchedClient, clientPhoneNumbers, setValue]);

  // Load authenticated agent or saved agent into form
  useEffect(() => {
    if (agentName) {
      setValue('agent', agentName);
    } else {
      const saved = loadLastAgent();
      if (saved) {
        setValue('agent', saved);
      }
    }
  }, [agentName, setValue]);

  // Handle choosing a client from the autocomplete dropdown
  const handleSelectClientSuggestion = useCallback((client: ClientRecord) => {
    setValue('clientName', client.name, { shouldValidate: true });

    // Auto-fill phone if available and on call
    const phone = (client.phoneNumbers && client.phoneNumbers[0]) || client.phoneNumber;
    if (phone) {
      setValue('phoneDetail', phone, { shouldValidate: true });
    }
    // Auto-select primary product if available
    if (client.ownedProducts && client.ownedProducts.length > 0) {
      setValue('clientProduct', client.ownedProducts[0], { shouldValidate: true });
    }
  }, [setValue]);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  /**
   * Switches the form view mode and saves the preference to localStorage.
   */
  const handleSetViewMode = (mode: 'grid' | 'vertical') => {
    setViewMode(mode);
    saveFormViewMode(mode);
  };

  /**
   * Handles date input changes and syncs the derived day of the week.
   * Prevents selecting future dates beyond today.
   */
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const today = getTodayDateString();
    if (newDate && newDate > today) {
      setValue('date', today, { shouldValidate: true });
      setValue('dayOfWeek', getDayOfWeekFromDate(today));
      return;
    }
    setValue('date', newDate, { shouldValidate: true });
    setValue('dayOfWeek', getDayOfWeekFromDate(newDate));
  };

  /**
   * Applies parsed row data from Excel directly into the form fields.
   */
  const handleApplyParsedExcel = useCallback((parsed: ParsedExcelRow) => {
    const today = getTodayDateString();
    const safeDate = parsed.date && parsed.date > today ? today : parsed.date;
    setValue('date', safeDate, { shouldValidate: true, shouldDirty: true });
    setValue('dayOfWeek', parsed.dayOfWeek || getDayOfWeekFromDate(safeDate));
    setValue('clientName', parsed.clientName, { shouldValidate: true, shouldDirty: true });
    setValue('channel', parsed.channel, { shouldValidate: true, shouldDirty: true });
    if (parsed.channel === 'Call') {
      setValue('phoneDetail', parsed.phoneDetail, { shouldValidate: true, shouldDirty: true });
      setValue('chatTicketDetail', '');
    } else {
      setValue('chatTicketDetail', parsed.chatTicketDetail, { shouldValidate: true, shouldDirty: true });
      setValue('phoneDetail', '');
    }
    setValue('clientProduct', parsed.clientProduct, { shouldValidate: true, shouldDirty: true });
    setValue('caseClassification', parsed.caseClassification, { shouldValidate: true, shouldDirty: true });
    setValue('status', parsed.status, { shouldValidate: true, shouldDirty: true });
    setValue('license', parsed.license, { shouldValidate: true, shouldDirty: true });
    setValue('inEvent', parsed.inEvent, { shouldValidate: true, shouldDirty: true });
    setValue('firstTimeUser', parsed.firstTimeUser, { shouldValidate: true, shouldDirty: true });
    setValue('additionalNotes', parsed.additionalNotes, { shouldValidate: true, shouldDirty: true });

    // For Team Leads: allow Excel's agent name to populate the form for backfilling entries
    if (userRole === 'team_lead' && parsed.agent) {
      const formattedAgent = formatAgentDisplayName(parsed.agent) || parsed.agent.trim();
      setValue('agent', formattedAgent, { shouldValidate: true, shouldDirty: true });
    }

    setSuccessToastMessage('Excel row pre-filled! Please review and submit.');
    setShowSuccessToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowSuccessToast(false), 3000);
  }, [setValue, userRole]);

  /**
   * Handles opening the Paste from Excel modal or directly parsing from the clipboard if available.
   */
  const handleOpenPasteFromExcel = async () => {
    const text = await readTextFromClipboard();
    if (text && text.includes('\t')) {
      const { data, error } = parseExcelRow(text, products, classifications);
      if (data && !error) {
        handleApplyParsedExcel(data);
        return;
      } else if (text.trim()) {
        setPasteModalInitialText(text);
        setIsPasteModalOpen(true);
        return;
      }
    }
    setPasteModalInitialText('');
    setIsPasteModalOpen(true);
  };

  /**
   * Handles valid form submissions from React Hook Form.
   */
  const onFormSubmit = (data: InteractionFormInputs) => {
    // Prevent submitting future dates
    if (data.date > getTodayDateString()) {
      return;
    }

    if (data.channel === 'Call') {
      const phoneValidation = validatePhoneNumber(data.phoneDetail);
      if (!phoneValidation.isValid) {
        return;
      }
    }

    const finalChannelDetails = formatChannelDetailsForSubmit(
      data.channel,
      data.channel === 'Call' ? data.phoneDetail : data.chatTicketDetail,
      helpdeskName
    );

    // Format agent name to First Name + Last Initial
    const formattedAgent = formatAgentDisplayName(data.agent) || data.agent.trim();

    // Save agent name for future logs
    saveLastAgent(formattedAgent);

    // Resolve timestamp: if date is historical (earlier than today), fallback to midnight
    const { time } = resolveInteractionTimestamp(data.date);

    const newInteraction: InteractionFormData = {
      date: data.date,
      dayOfWeek: data.dayOfWeek || getDayOfWeekFromDate(data.date),
      time: time,
      agent: formattedAgent,
      clientName: data.clientName.trim(),
      channel: data.channel,
      channelDetails: finalChannelDetails,
      clientProduct: data.clientProduct,
      caseClassification: data.caseClassification,
      status: data.status as StatusType,
      license: data.license || 'support_active',
      inEvent: data.inEvent === true,
      firstTimeUser: data.firstTimeUser === true,
      additionalNotes: data.additionalNotes.trim(),
    };

    onAddInteraction(newInteraction);
    onSubmitSuccess?.();
    lastAutoFilledClientRef.current = null;

    // Reset form fields back to defaults with today's date, retaining the agent
    userManuallySelectedProductRef.current = false;
    reset({
      ...getDefaultValues(agentName || formattedAgent, products[0] || '', classifications[0]),
      agent: formattedAgent,
    });

    // Show temporary feedback toast for 2.5s
    setSuccessToastMessage('Interaction Logged!');
    setShowSuccessToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowSuccessToast(false), 2500);
  };

  /**
   * Resets the form fields to default values (today's date) while retaining the agent.
   */
  const handleClearFields = () => {
    userManuallySelectedProductRef.current = false;
    lastAutoFilledClientRef.current = null;
    const currentValues = getValues();
    reset({
      ...getDefaultValues(agentName || currentValues.agent, products[0] || '', classifications[0]),
      agent: currentValues.agent,
    });
  };

  /**
   * Keyboard shortcut: Ctrl+Enter or Cmd+Enter to submit the form.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      suppressPhoneEmptyErrorRef.current = false;
      handleSubmit(onFormSubmit)();
    }
  };

  /**
   * Sequential Enter key navigation: advances focus to the next field or button (except textarea),
   * and Ctrl+Enter / Cmd+Enter submits the form.
   */
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    handleFormEnterKeyNavigation(e, () => {
      suppressPhoneEmptyErrorRef.current = false;
      handleSubmit(onFormSubmit)();
    });
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8 transition-colors"
      onKeyDown={handleKeyDown}
    >
      {/* Form Header - Support Operations Branded Header with View Toggle */}
      <div className="bg-slate-900 dark:bg-slate-900/95 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-xl bg-slate-800/80 dark:bg-slate-800 border border-slate-700/70 dark:border-slate-700 flex items-center justify-center">
            <AppLogo iconOnly className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-white">Client Interaction Summary</h2>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-fotoblue-500/15 dark:bg-fotoblue-950/70 text-fotoblue-400 dark:text-fotoblue-300 rounded-md border border-fotoblue-500/25 dark:border-fotoblue-800/60">
                Support Operations
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Success Toast Notification */}
          {showSuccessToast && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/90 text-white rounded-full text-xs font-semibold animate-fade-in shadow-sm">
              <Check className="w-3.5 h-3.5" />
              <span>{successToastMessage}</span>
            </div>
          )}

          {/* Paste from Excel Action Button */}
          <button
            type="button"
            onClick={handleOpenPasteFromExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 text-xs font-bold transition-all shadow-xs cursor-pointer group"
            title="Import a single row copied from Excel (Right-click row number -> Copy)"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-fotoblue-400 group-hover:scale-110 transition-transform" />
            <span>Paste from Excel</span>
          </button>

          {/* View Mode Toggle Button Group */}
          <div className="flex items-center bg-slate-950/80 dark:bg-slate-950/70 p-1 rounded-xl border border-slate-800 dark:border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => handleSetViewMode('vertical')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'vertical'
                  ? 'bg-fotoblue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Switch to Vertical view for a clean, spacious sequential layout"
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span>Vertical View</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-fotoblue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Switch to Compact Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Validation alert banner if submitted with errors */}
      {isSubmitted && hasErrors && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-800 px-6 py-3 flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>Please complete all required fields marked below before submitting.</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          suppressPhoneEmptyErrorRef.current = false;
          handleSubmit(onFormSubmit)(e);
        }}
        onKeyDown={handleFormKeyDown}
        className="p-6"
      >
        {viewMode === 'vertical' ? (
          /* ========================================================================= */
          /* VERTICAL VIEW: Sequential, spacious vertical layout for easy entry        */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Step 1: General & Client Information */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-fotoblue-100 dark:bg-fotoblue-950 text-fotoblue-700 dark:text-fotoblue-300">
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    1. General & Client Information
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-rose-500">* Required</span>
              </div>

              {/* Date & Day */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                    <span>Date & Day of Interaction</span>
                  </span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div
                  className={`flex rounded-xl border bg-white dark:bg-slate-800 overflow-hidden shadow-2xs ${
                    errors.date
                      ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50'
                      : 'border-slate-300 dark:border-slate-600 focus-within:ring-2 focus-within:ring-fotoblue-500 focus-within:border-fotoblue-500'
                  }`}
                >
                  <input
                    type="date"
                    max={getTodayDateString()}
                    {...register('date', {
                      required: 'Date is required',
                      validate: (val) => val <= getTodayDateString() || 'Future dates are not allowed',
                    })}
                    onChange={handleDateChange}
                    className="w-1/2 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none"
                  />
                  <div className="w-1/2 px-3 py-2.5 text-sm font-semibold text-fotoblue-900 dark:text-fotoblue-200 bg-fotoblue-50/60 dark:bg-fotoblue-950/40 border-l border-slate-200 dark:border-slate-700 flex items-center justify-center select-none">
                    {dayOfWeek || 'Select date'}
                  </div>
                </div>
                {errors.date && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">{errors.date.message}</p>
                )}
              </div>

              {/* Support Agent */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                    <span>Support Agent</span>
                  </span>
                  {userRole === 'team_lead' ? (
                    <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                      Team Lead (Editable)
                    </span>
                  ) : agentName ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Verified
                    </span>
                  ) : (
                    <span className="text-rose-500 font-bold">*</span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex M."
                  readOnly={Boolean(agentName && userRole !== 'team_lead')}
                  {...register('agent', {
                    required: 'Agent name is required',
                    validate: (val) => (val && val.trim().length > 0) || 'Agent name is required',
                  })}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-xl shadow-2xs focus:outline-none ${
                    agentName && userRole !== 'team_lead'
                      ? 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed border-slate-200 dark:border-slate-700'
                      : errors.agent
                      ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20 text-slate-900 dark:text-slate-100'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
                  }`}
                />
                {errors.agent && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">{errors.agent.message}</p>
                )}
              </div>

              {/* Client Name / Company */}
              <Controller
                name="clientName"
                control={control}
                rules={{
                  required: 'Client name is required',
                  validate: (val) => (val && val.trim().length > 0) || 'Client name is required',
                }}
                render={({ field }) => (
                  <ClientAutocompleteInput
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    onSelectClient={(client) => handleSelectClientSuggestion(client as any)}
                    clients={clients as any}
                    error={errors.clientName?.message}
                  />
                )}
              />
            </div>

            {/* Step 2: Communication Channel */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-fotoblue-100 dark:bg-fotoblue-950 text-fotoblue-700 dark:text-fotoblue-300">
                    <Phone className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    2. Communication Channel
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-rose-500">* Required</span>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Channel Type</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 bg-slate-200/70 dark:bg-slate-900/90 border border-slate-300/40 dark:border-slate-700/80 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setValue('channel', 'Call', { shouldValidate: true })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                      channel === 'Call'
                        ? 'bg-white dark:bg-slate-800 text-fotoblue-700 dark:text-fotoblue-300 shadow-xs border border-slate-200/60 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Phone className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400" />
                    <span>Call (Phone)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('channel', 'Chat', { shouldValidate: true })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                      channel === 'Chat'
                        ? 'bg-white dark:bg-slate-800 text-fotodeep-600 dark:text-fotodeep-300 shadow-xs border border-slate-200/60 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-fotodeep-500 dark:text-fotodeep-400" />
                    <span>Chat ({helpdeskName})</span>
                  </button>
                </div>
              </div>

              {/* Channel Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Channel Details ({channel === 'Call' ? 'Phone Number' : `${helpdeskName} Ticket / Link`})</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>

                {channel === 'Chat' ? (
                  <div>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3.5 bg-fotodeep-50 dark:bg-fotodeep-950/60 border border-fotodeep-200 dark:border-fotodeep-800 rounded-xl text-fotodeep-700 dark:text-fotodeep-300 text-xs font-bold whitespace-nowrap">
                        {helpdeskName}
                      </div>
                      <input
                        type="text"
                        placeholder={`Ticket ID or Link (Optional - defaults to '${helpdeskName}')`}
                        {...register('chatTicketDetail')}
                        className="w-full px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl shadow-2xs focus:ring-2 focus:ring-fotodeep-500 focus:border-fotodeep-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                      Automatically logged as <strong>{helpdeskName}</strong> if ticket ID is left blank.
                    </p>
                  </div>
                ) : (
                  <Controller
                    name="phoneDetail"
                    control={control}
                    rules={{
                      validate: (val) => {
                        if (channel === 'Call') {
                          if (suppressPhoneEmptyErrorRef.current && (!val || !val.trim())) {
                            return true;
                          }
                          const res = validatePhoneNumber(val);
                          if (!res.isValid) return res.error;
                        }
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <PhoneNumberField
                        value={field.value}
                        onChange={(val) => {
                          if (val) {
                            suppressPhoneEmptyErrorRef.current = false;
                          }
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        onStartNewNumber={() => {
                          suppressPhoneEmptyErrorRef.current = true;
                          clearErrors('phoneDetail');
                        }}
                        matchedClient={matchedClient as any}
                        clientPhoneNumbers={clientPhoneNumbers}
                        error={errors.phoneDetail?.message}
                      />
                    )}
                  />
                )}
              </div>
            </div>

            {/* Step 3: Product, Classification & Status */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-fotoblue-100 dark:bg-fotoblue-950 text-fotoblue-700 dark:text-fotoblue-300">
                    <Package className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    3. Product & Case Details
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-rose-500">* Required</span>
              </div>

              {/* Product / Hardware Selection */}
              <Controller
                name="clientProduct"
                control={control}
                rules={{ required: 'Please select a Client Product' }}
                render={({ field }) => (
                  <ProductSelector
                    value={field.value}
                    onChange={(val) => {
                      userManuallySelectedProductRef.current = true;
                      field.onChange(val);
                    }}
                    products={products}
                    matchedClient={matchedClient as any}
                    error={errors.clientProduct?.message}
                  />
                )}
              />

              {/* Case Classification */}
              <Controller
                name="caseClassification"
                control={control}
                rules={{ required: 'Please select a Case Classification' }}
                render={({ field }) => (
                  <ClassificationSelector
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    classifications={classifications}
                    error={errors.caseClassification?.message}
                  />
                )}
              />

              {/* Status */}
              <Controller
                name="status"
                control={control}
                rules={{ required: 'Please select a Status' }}
                render={({ field }) => (
                  <StatusSelector
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    error={errors.status?.message}
                    label="Interaction Status"
                  />
                )}
              />
            </div>

            {/* Step 4: Support Eligibility & Event Context */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-fotoblue-100 dark:bg-fotoblue-950 text-fotoblue-700 dark:text-fotoblue-300">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    4. Support Eligibility & Event Verification
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-rose-500">* Required</span>
              </div>

              <div className="space-y-3">
                {/* Support License / Eligibility */}
                <Controller
                  name="license"
                  control={control}
                  rules={{
                    required: 'Please select a support license option',
                  }}
                  render={({ field }) => (
                    <LicenseSelector
                      license={field.value}
                      supportTiers={supportTiers}
                      onChangeLicense={(val) => field.onChange(val)}
                      error={errors.license?.message}
                    />
                  )}
                />

                {/* In Event */}
                <Controller
                  name="inEvent"
                  control={control}
                  rules={{
                    validate: (val) => val !== null || 'Please select Yes or No',
                  }}
                  render={({ field }) => (
                    <div>
                      <div
                        className={`p-4 rounded-xl border bg-white dark:bg-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          errors.inEvent
                            ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                            : field.value === true
                            ? 'border-fotoblue-400 bg-fotoblue-50/50 dark:bg-fotoblue-950/40 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              field.value === true
                                ? 'bg-fotoblue-600 text-white shadow-xs'
                                : field.value === false
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <span>In Event</span>
                              <span className="text-rose-500">*</span>
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Is the customer currently at a live, active event?
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:w-48 bg-slate-100 dark:bg-slate-700/70 p-1 rounded-lg text-xs font-bold shrink-0">
                          <button
                            type="button"
                            onClick={() => field.onChange(true)}
                            className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              field.value === true
                                ? 'bg-fotoblue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Yes</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange(false)}
                            className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              field.value === false
                                ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                            }`}
                          >
                            <span>No</span>
                          </button>
                        </div>
                      </div>
                      {errors.inEvent && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold px-1 mt-1">
                          {errors.inEvent.message}
                        </p>
                      )}
                    </div>
                  )}
                />

                {/* First Time User */}
                <Controller
                  name="firstTimeUser"
                  control={control}
                  rules={{
                    validate: (val) => val !== null || 'Please select Yes or No',
                  }}
                  render={({ field }) => (
                    <div>
                      <div
                        className={`p-4 rounded-xl border bg-white dark:bg-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          errors.firstTimeUser
                            ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                            : field.value === true
                            ? 'border-fotoblue-300 dark:border-fotoblue-700 bg-fotoblue-50/30 dark:bg-fotoblue-950/30'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              field.value === true
                                ? 'bg-fotoblue-100 dark:bg-fotoblue-950/60 text-fotoblue-700 dark:text-fotoblue-300'
                                : field.value === false
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <span>First Time User</span>
                              <span className="text-rose-500">*</span>
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Is this the customer's first time using or configuring this product?
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:w-48 bg-slate-100 dark:bg-slate-700/70 p-1 rounded-lg text-xs font-bold shrink-0">
                          <button
                            type="button"
                            onClick={() => field.onChange(true)}
                            className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              field.value === true
                                ? 'bg-fotoblue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Yes</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange(false)}
                            className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              field.value === false
                                ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                            }`}
                          >
                            <span>No</span>
                          </button>
                        </div>
                      </div>
                      {errors.firstTimeUser && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold px-1 mt-1">
                          {errors.firstTimeUser.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Step 5: Summary & Additional Notes */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-fotoblue-100 dark:bg-fotoblue-950 text-fotoblue-700 dark:text-fotoblue-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    5. Interaction Notes & Summary
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-rose-500">* Required</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                    <span>Additional Notes & Troubleshooting Details</span>
                  </span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter interaction notes, issue description, troubleshooting steps taken, and resolution or follow-up details..."
                  {...register('additionalNotes', {
                    required: 'Additional notes / summary is required',
                    validate: (val) => (val && val.trim().length > 0) || 'Additional notes / summary is required',
                  })}
                  className={`w-full px-4 py-3 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border rounded-xl shadow-2xs focus:outline-none resize-y placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                    errors.additionalNotes
                      ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                      : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
                  }`}
                />
                {errors.additionalNotes && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                    {errors.additionalNotes.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* GRID VIEW: High-density multi-column compact layout                       */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* ROW 1: Date & Day, Agent, Client Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date and Day of Interaction */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                    <span>Date & Day of Interaction</span>
                  </span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div
                  className={`flex rounded-xl border bg-white dark:bg-slate-800 overflow-hidden shadow-2xs ${
                    errors.date
                      ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50'
                      : 'border-slate-300 dark:border-slate-600 focus-within:ring-2 focus-within:ring-fotoblue-500 focus-within:border-fotoblue-500'
                  }`}
                >
                  <input
                    type="date"
                    max={getTodayDateString()}
                    {...register('date', {
                      required: 'Date is required',
                      validate: (val) => val <= getTodayDateString() || 'Future dates are not allowed',
                    })}
                    onChange={handleDateChange}
                    className="w-1/2 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none"
                  />
                  <div className="w-1/2 px-3 py-2 text-sm font-semibold text-fotoblue-900 dark:text-fotoblue-200 bg-fotoblue-50/60 dark:bg-fotoblue-950/40 border-l border-slate-200 dark:border-slate-700 flex items-center justify-center select-none">
                    {dayOfWeek || 'Select date'}
                  </div>
                </div>
                {errors.date && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">{errors.date.message}</p>
                )}
              </div>

              {/* Agent */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                    <span>Agent</span>
                  </span>
                  {userRole === 'team_lead' ? (
                    <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                      Team Lead (Editable)
                    </span>
                  ) : agentName ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Verified
                    </span>
                  ) : (
                    <span className="text-rose-500 font-bold">*</span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  readOnly={Boolean(agentName && userRole !== 'team_lead')}
                  {...register('agent', {
                    required: 'Agent name is required',
                    validate: (val) => (val && val.trim().length > 0) || 'Agent name is required',
                  })}
                  className={`w-full px-3 py-2 text-sm border rounded-xl shadow-2xs focus:outline-none ${
                    agentName && userRole !== 'team_lead'
                      ? 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed border-slate-200 dark:border-slate-700'
                      : errors.agent
                      ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20 text-slate-900 dark:text-slate-100'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
                  }`}
                />
                {errors.agent && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">{errors.agent.message}</p>
                )}
              </div>

              {/* Client Name */}
              <Controller
                name="clientName"
                control={control}
                rules={{
                  required: 'Client name is required',
                  validate: (val) => (val && val.trim().length > 0) || 'Client name is required',
                }}
                render={({ field }) => (
                  <ClientAutocompleteInput
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    onSelectClient={(client) => handleSelectClientSuggestion(client as any)}
                    clients={clients as any}
                    error={errors.clientName?.message}
                  />
                )}
              />
            </div>

            {/* ROW 2: Channel & Channel Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Channel</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-200/70 dark:bg-slate-900/90 border border-slate-300/40 dark:border-slate-700/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setValue('channel', 'Call', { shouldValidate: true })}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                      channel === 'Call'
                        ? 'bg-white dark:bg-slate-800 text-fotoblue-700 dark:text-fotoblue-300 shadow-xs border border-slate-200/60 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Phone className="w-4 h-4 text-fotoblue-600 dark:text-fotoblue-400" />
                    <span>Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('channel', 'Chat', { shouldValidate: true })}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                      channel === 'Chat'
                        ? 'bg-white dark:bg-slate-800 text-fotodeep-600 dark:text-fotodeep-300 shadow-xs border border-slate-200/60 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-fotodeep-500 dark:text-fotodeep-400" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>

              {/* Channel Details */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>Channel Details ({channel === 'Call' ? 'Phone Number' : helpdeskName})</span>
                  </span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>

                {channel === 'Chat' ? (
                  <div>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3.5 bg-fotodeep-50 dark:bg-fotodeep-950/60 border border-fotodeep-200 dark:border-fotodeep-800 rounded-xl text-fotodeep-700 dark:text-fotodeep-300 text-xs font-bold whitespace-nowrap">
                        {helpdeskName}
                      </div>
                      <input
                        type="text"
                        placeholder={`Ticket ID or Link (Optional - defaults to '${helpdeskName}')`}
                        {...register('chatTicketDetail')}
                        className="w-full px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl shadow-2xs focus:ring-2 focus:ring-fotodeep-500 focus:border-fotodeep-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Automatically logged as <strong>{helpdeskName}</strong> if specific ticket ID is left blank.
                    </p>
                  </div>
                ) : (
                  <Controller
                    name="phoneDetail"
                    control={control}
                    rules={{
                      validate: (val) => {
                        if (channel === 'Call') {
                          if (suppressPhoneEmptyErrorRef.current && (!val || !val.trim())) {
                            return true;
                          }
                          const res = validatePhoneNumber(val);
                          if (!res.isValid) return res.error;
                        }
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <PhoneNumberField
                        value={field.value}
                        onChange={(val) => {
                          if (val) {
                            suppressPhoneEmptyErrorRef.current = false;
                          }
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        onStartNewNumber={() => {
                          suppressPhoneEmptyErrorRef.current = true;
                          clearErrors('phoneDetail');
                        }}
                        matchedClient={matchedClient as any}
                        clientPhoneNumbers={clientPhoneNumbers}
                        error={errors.phoneDetail?.message}
                      />
                    )}
                  />
                )}
              </div>
            </div>

            {/* ROW 3: Client Product, Case Classification, Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Client Product */}
              <Controller
                name="clientProduct"
                control={control}
                rules={{ required: 'Please select a Client Product' }}
                render={({ field }) => (
                  <ProductSelector
                    value={field.value}
                    onChange={(val) => {
                      userManuallySelectedProductRef.current = true;
                      field.onChange(val);
                    }}
                    products={products}
                    matchedClient={matchedClient as any}
                    error={errors.clientProduct?.message}
                  />
                )}
              />

              {/* Case Classification */}
              <Controller
                name="caseClassification"
                control={control}
                rules={{ required: 'Please select a Case Classification' }}
                render={({ field }) => (
                  <ClassificationSelector
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    classifications={classifications}
                    error={errors.caseClassification?.message}
                  />
                )}
              />

              {/* Status */}
              <Controller
                name="status"
                control={control}
                rules={{ required: 'Please select a Status' }}
                render={({ field }) => (
                  <StatusSelector
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    error={errors.status?.message}
                    label="Status"
                  />
                )}
              />
            </div>

            {/* UNIFIED SECTION: Additional Details (Flags + Additional Notes) */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-fotoblue-100 dark:bg-fotoblue-950 text-fotoblue-700 dark:text-fotoblue-300">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Additional Details
                  </h3>
                </div>
                <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <span>* All required</span>
                </span>
              </div>

              {/* 3 Boolean Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Support License / Eligibility */}
                <Controller
                  name="license"
                  control={control}
                  rules={{
                    required: 'Please select a support license option',
                  }}
                  render={({ field }) => (
                    <LicenseSelector
                      license={field.value}
                      supportTiers={supportTiers}
                      onChangeLicense={(val) => field.onChange(val)}
                      error={errors.license?.message}
                      compact
                    />
                  )}
                />

                {/* In Event */}
                <Controller
                  name="inEvent"
                  control={control}
                  rules={{
                    validate: (val) => val !== null || 'Please select Yes or No',
                  }}
                  render={({ field }) => (
                    <div
                      className={`p-3 rounded-xl border bg-white dark:bg-slate-800 flex flex-col justify-between transition-all ${
                        errors.inEvent
                          ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                          : field.value === true
                          ? 'border-fotoblue-400 bg-fotoblue-50/50 dark:bg-fotoblue-950/40 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-lg ${
                              field.value === true
                                ? 'bg-fotoblue-600 text-white shadow-xs'
                                : field.value === false
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Zap className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <span>In Event</span>
                              <span className="text-rose-500">*</span>
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">Live active event</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-700/70 p-1 rounded-lg text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => field.onChange(true)}
                          className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            field.value === true
                              ? 'bg-fotoblue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Yes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange(false)}
                          className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            field.value === false
                              ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                          }`}
                        >
                          <span>No</span>
                        </button>
                      </div>
                      {errors.inEvent && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1.5">{errors.inEvent.message}</p>
                      )}
                    </div>
                  )}
                />

                {/* First Time Using Product */}
                <Controller
                  name="firstTimeUser"
                  control={control}
                  rules={{
                    validate: (val) => val !== null || 'Please select Yes or No',
                  }}
                  render={({ field }) => (
                    <div
                      className={`p-3 rounded-xl border bg-white dark:bg-slate-800 flex flex-col justify-between transition-all ${
                        errors.firstTimeUser
                          ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                          : field.value === true
                          ? 'border-fotoblue-300 dark:border-fotoblue-700 bg-fotoblue-50/30 dark:bg-fotoblue-950/30'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-lg ${
                              field.value === true
                                ? 'bg-fotoblue-100 dark:bg-fotoblue-950/60 text-fotoblue-700 dark:text-fotoblue-300'
                                : field.value === false
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <span>First Time User</span>
                              <span className="text-rose-500">*</span>
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">First time using product</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-700/70 p-1 rounded-lg text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => field.onChange(true)}
                          className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            field.value === true
                              ? 'bg-fotoblue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Yes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange(false)}
                          className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            field.value === false
                              ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-600'
                          }`}
                        >
                          <span>No</span>
                        </button>
                      </div>
                      {errors.firstTimeUser && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1.5">{errors.firstTimeUser.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>

              {/* Additional Notes Textarea within Additional Details */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-fotoblue-600 dark:text-fotoblue-400" />
                    <span>Additional Notes</span>
                  </span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter interaction notes, troubleshooting steps, or follow-up details..."
                  {...register('additionalNotes', {
                    required: 'Additional notes / summary is required',
                    validate: (val) => (val && val.trim().length > 0) || 'Additional notes / summary is required',
                  })}
                  className={`w-full px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border rounded-xl shadow-2xs focus:outline-none resize-y placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                    errors.additionalNotes
                      ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                      : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500'
                  }`}
                />
                {errors.additionalNotes && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                    {errors.additionalNotes.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit & Reset Bar */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClearFields}
            className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Clear Fields
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 font-mono text-[10px]">Ctrl+Enter</kbd> to submit
            </span>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-fotoblue-500 via-fotodeep-500 to-fototeal-500 hover:from-fotoblue-600 hover:to-fototeal-600 dark:bg-none dark:bg-fotoblue-600 dark:hover:bg-fotoblue-500 text-white font-bold text-sm rounded-xl shadow-md shadow-fotoblue-500/25 dark:shadow-fotoblue-950/60 dark:border dark:border-fotoblue-400/30 hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log Interaction</span>
            </button>
          </div>
        </div>
      </form>

      {/* Paste from Excel Modal Dialog */}
      <PasteExcelModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onApply={handleApplyParsedExcel}
        initialText={pasteModalInitialText}
      />
    </div>
  );
});
