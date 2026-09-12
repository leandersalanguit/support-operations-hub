/**
 * @file InteractionForm.tsx
 * @description Main input form component for logging new customer interactions using React Hook Form.
 * Handles state management, validation, and submission of interaction details.
 * Supports both a clean, spacious Vertical View and a compact Grid View with view persistence.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
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
  handleFormEnterKeyNavigation,
} from './common';
import {
  InteractionGeneralFields,
  InteractionChannelFields,
  InteractionProductFields,
  InteractionContextFields,
  InteractionNotesField,
} from './interaction-form';
import {
  Phone,
  PlusCircle,
  User,
  Package,
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
      {(() => {
        const isCompact = viewMode === 'grid';

        const generalFields = (
          <InteractionGeneralFields
            register={register}
            control={control}
            errors={errors}
            dayOfWeek={dayOfWeek}
            agentName={agentName}
            userRole={userRole}
            clients={clients}
            onDateChange={handleDateChange}
            onSelectClientSuggestion={handleSelectClientSuggestion}
            compact={isCompact}
          />
        );

        const channelFields = (
          <InteractionChannelFields
            register={register}
            control={control}
            setValue={setValue}
            clearErrors={clearErrors}
            errors={errors}
            channel={channel}
            helpdeskName={helpdeskName}
            matchedClient={matchedClient}
            clientPhoneNumbers={clientPhoneNumbers}
            suppressPhoneEmptyErrorRef={suppressPhoneEmptyErrorRef}
            compact={isCompact}
          />
        );

        const productFields = (
          <InteractionProductFields
            control={control}
            errors={errors}
            products={products}
            classifications={classifications}
            matchedClient={matchedClient}
            userManuallySelectedProductRef={userManuallySelectedProductRef}
            compact={isCompact}
          />
        );

        const contextFields = (
          <InteractionContextFields
            control={control}
            errors={errors}
            supportTiers={supportTiers}
            compact={isCompact}
          />
        );

        const notesField = (
          <InteractionNotesField
            register={register}
            errors={errors}
            compact={isCompact}
          />
        );

        return viewMode === 'vertical' ? (
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
              {generalFields}
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
              {channelFields}
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
              {productFields}
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
                {contextFields}
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
              {notesField}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* GRID VIEW: High-density multi-column compact layout                       */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* ROW 1: Date & Day, Agent, Client Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generalFields}
            </div>

            {/* ROW 2: Channel & Channel Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
              {channelFields}
            </div>

            {/* ROW 3: Client Product, Case Classification, Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {productFields}
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
                {contextFields}
              </div>

              {/* Additional Notes Textarea within Additional Details */}
              <div className="pt-2">
                {notesField}
              </div>
            </div>
          </div>
        );
      })()}

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
