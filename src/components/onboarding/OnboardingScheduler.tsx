/**
 * @file OnboardingScheduler.tsx
 * @description Main dashboard view for scheduling client onboarding sessions on Philippine Time (PHT, UTC+8),
 * converting to client local timezones, generating copyable outreach messages, and booking on the reference calendar.
 * Decomposed into focused sub-components for modularity, readability, and clean maintenance.
 */

import React from 'react';
import { ClientProfile } from '../../types';
import { useOnboardingScheduler } from '../../application/useOnboardingScheduler';
import { OnboardingHeader } from './OnboardingHeader';
import { OperationalSlotsPicker } from './OperationalSlotsPicker';
import { ClientDetailsForm } from './ClientDetailsForm';
import { OutreachMessageCard } from './OutreachMessageCard';
import { ReferenceSessionsTable } from './ReferenceSessionsTable';

interface OnboardingSchedulerProps {
  clients: ClientProfile[];
  currentAgentName?: string;
  onNavigateToSummary?: () => void;
}

export const OnboardingScheduler: React.FC<OnboardingSchedulerProps> = ({
  clients,
  currentAgentName = '',
  onNavigateToSummary,
}) => {
  const {
    selectedDate,
    setSelectedDate,
    slots,
    selectedSlot,
    setSelectedSlot,
    dayOfWeekIndex,
    isLoadingSlots,

    sessions,
    isLoadingSessions,
    isSlotBooked,
    getSlotBooking,

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

    convertedTime,
    handleCopyMessage,
    isMessageCopied,

    bookCurrentSlot,
    cancelBooking,
    isBooking,
    bookingError,
    bookingSuccessMessage,
  } = useOnboardingScheduler({
    clients,
    currentAgentName,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner & Live PHT Clock */}
      <OnboardingHeader onNavigateToSummary={onNavigateToSummary} />

      {/* Main Grid: Left Column (Date & Slots) | Right Column (Client Form & Converted Message) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Date Picker & PHT Operational Slots */}
        <div className="lg:col-span-5">
          <OperationalSlotsPicker
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            dayOfWeekIndex={dayOfWeekIndex}
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            isLoadingSlots={isLoadingSlots}
            isSlotBooked={isSlotBooked}
            getSlotBooking={getSlotBooking}
          />
        </div>

        {/* RIGHT COLUMN: Client Details Form & Outreach Message Card */}
        <div className="lg:col-span-7 space-y-6">
          <ClientDetailsForm
            selectedSlot={selectedSlot}
            clientName={clientName}
            setClientName={setClientName}
            clientPhone={clientPhone}
            setClientPhone={setClientPhone}
            product={product}
            setProduct={setProduct}
            clientTimezone={clientTimezone}
            setClientTimezone={setClientTimezone}
            notes={notes}
            setNotes={setNotes}
            clientSuggestions={clientSuggestions}
            selectClient={selectClient}
          />

          <OutreachMessageCard
            convertedTime={convertedTime}
            selectedSlot={selectedSlot}
            isSlotBooked={isSlotBooked}
            handleCopyMessage={handleCopyMessage}
            isMessageCopied={isMessageCopied}
            bookCurrentSlot={bookCurrentSlot}
            isBooking={isBooking}
            bookingError={bookingError}
            bookingSuccessMessage={bookingSuccessMessage}
          />
        </div>
      </div>

      {/* BOTTOM SECTION: Reference Calendar Booked Sessions Table */}
      <ReferenceSessionsTable
        sessions={sessions}
        onCancelSession={cancelBooking}
        isLoading={isLoadingSessions}
      />
    </div>
  );
};
