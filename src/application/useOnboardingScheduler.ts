/**
 * @file useOnboardingScheduler.ts
 * @description Custom application hook managing the Client Onboarding Scheduler workflow,
 * including slot availability on Philippine Time, CRM client autocomplete,
 * dynamic timezone conversion, clipboard copying, and reference calendar booking.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  OnboardingSlot,
  ScheduledSession,
  ConvertedTimeResult,
  ClientProfile,
} from '../types';
import { convertPhtSlotToClientTimezone } from '../domain/onboarding/timezone';
import { onboardingRepo } from '../infrastructure/supabase/onboardingRepo';
import { getTodayDateString } from '../domain/interaction/timestamp';
import { useClipboardCopy } from '../utils/clipboard';

export interface UseOnboardingSchedulerParams {
  clients?: ClientProfile[];
  currentAgentName?: string;
  initialTimezone?: string;
}

export function getDayOfWeekIndex(dateString: string): number {
  if (!dateString) return new Date().getDay();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function useOnboardingScheduler({
  clients = [],
  currentAgentName = '',
  initialTimezone = 'America/Los_Angeles',
}: UseOnboardingSchedulerParams = {}) {
  // Calendar & Slot selection state
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [slots, setSlots] = useState<OnboardingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<OnboardingSlot | null>(null);

  // Reference Calendar sessions state
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);

  // Client Scheduling Form State
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [product, setProduct] = useState<string>('');
  const [clientTimezone, setClientTimezone] = useState<string>(initialTimezone);
  const [notes, setNotes] = useState<string>('');

  // Action feedback states
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);

  // Clipboard copy hook
  const { isCopied, copy } = useClipboardCopy(2500);

  // Day of week index (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const dayOfWeekIndex = useMemo(() => getDayOfWeekIndex(selectedDate), [selectedDate]);

  // Fetch slots for the selected date
  const loadSlots = useCallback(async (day: number) => {
    setIsLoadingSlots(true);
    try {
      const activeSlots = await onboardingRepo.getSlotsForDay(day);
      setSlots(activeSlots);
      // Auto-select first available slot
      if (activeSlots.length > 0) {
        setSelectedSlot((prev) => {
          if (prev && activeSlots.some((s) => s.id === prev.id)) {
            return prev;
          }
          return activeSlots[0];
        });
      } else {
        setSelectedSlot(null);
      }
    } catch (err) {
      console.error('Failed to load onboarding slots:', err);
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  // Fetch all scheduled sessions
  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const allSessions = await onboardingRepo.getSessions();
      setSessions(allSessions);
    } catch (err) {
      console.error('Failed to load scheduled sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSlots(dayOfWeekIndex);
  }, [dayOfWeekIndex, loadSlots]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Booked sessions for the selected date
  const bookedSessionsForDate = useMemo(() => {
    return sessions.filter(
      (s) => s.slotDate === selectedDate && s.status !== 'cancelled'
    );
  }, [sessions, selectedDate]);

  // Map of booked slot IDs for selected date
  const bookedSlotMap = useMemo(() => {
    const map = new Map<string, ScheduledSession>();
    bookedSessionsForDate.forEach((s) => {
      map.set(s.slotId, s);
    });
    return map;
  }, [bookedSessionsForDate]);

  // Check if a slot is booked
  const isSlotBooked = useCallback(
    (slotId: string): boolean => {
      return bookedSlotMap.has(slotId);
    },
    [bookedSlotMap]
  );

  const getSlotBooking = useCallback(
    (slotId: string): ScheduledSession | undefined => {
      return bookedSlotMap.get(slotId);
    },
    [bookedSlotMap]
  );

  // Timezone conversion result
  const convertedTime = useMemo<ConvertedTimeResult | null>(() => {
    if (!selectedDate || !selectedSlot) return null;
    return convertPhtSlotToClientTimezone(
      selectedDate,
      selectedSlot.startTime,
      selectedSlot.endTime,
      clientTimezone
    );
  }, [selectedDate, selectedSlot, clientTimezone]);

  // Client Autocomplete suggestions from existing CRM clients
  const clientSuggestions = useMemo(() => {
    if (!clientName.trim() || clientName.length < 2) return [];
    const query = clientName.toLowerCase();
    return clients
      .filter((c) => c.name.toLowerCase().includes(query))
      .slice(0, 5);
  }, [clientName, clients]);

  // Select client from autocomplete
  const selectClient = useCallback((client: ClientProfile) => {
    setClientName(client.name);
    const primaryPhone =
      client.phoneNumbers && client.phoneNumbers.length > 0
        ? client.phoneNumbers[0]
        : client.phoneNumber || '';
    if (primaryPhone) {
      setClientPhone(primaryPhone);
    }
    if (client.ownedProducts && client.ownedProducts.length > 0) {
      setProduct(client.ownedProducts[0]);
    }
  }, []);

  // Copy message handler
  const handleCopyMessage = useCallback(async () => {
    if (!convertedTime?.copyableMessage) return false;
    return await copy(convertedTime.copyableMessage, 'onboarding-slot-message');
  }, [convertedTime, copy]);

  // Booking action
  const bookCurrentSlot = useCallback(async () => {
    setBookingError(null);
    setBookingSuccessMessage(null);

    if (!selectedSlot) {
      setBookingError('Please select an available slot.');
      return null;
    }

    if (isSlotBooked(selectedSlot.id)) {
      setBookingError('This slot is already booked for the selected date.');
      return null;
    }

    if (!clientName.trim()) {
      setBookingError('Please enter the client name.');
      return null;
    }

    if (!product.trim()) {
      setBookingError('Please select or specify the product.');
      return null;
    }

    if (!convertedTime) {
      setBookingError('Failed to calculate slot timezone time.');
      return null;
    }

    setIsBooking(true);
    try {
      const newSession = await onboardingRepo.bookSession({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        product: product.trim(),
        clientTimezone,
        slotDate: selectedDate,
        slotId: selectedSlot.id,
        startIso: convertedTime.startIso,
        endIso: convertedTime.endIso,
        status: 'booked',
        bookedBy: currentAgentName,
        notes: notes.trim(),
      });

      // Refresh sessions list
      await loadSessions();

      setBookingSuccessMessage(
        `Successfully booked onboarding session for ${newSession.clientName}!`
      );

      // Reset client inputs (keep timezone)
      setClientName('');
      setClientPhone('');
      setNotes('');

      return newSession;
    } catch (err: any) {
      const msg = err?.message || 'Failed to book slot on reference calendar.';
      setBookingError(msg);
      return null;
    } finally {
      setIsBooking(false);
    }
  }, [
    selectedSlot,
    isSlotBooked,
    clientName,
    product,
    clientPhone,
    clientTimezone,
    selectedDate,
    convertedTime,
    currentAgentName,
    notes,
    loadSessions,
  ]);

  // Cancel booking action
  const cancelBooking = useCallback(
    async (sessionId: string) => {
      try {
        await onboardingRepo.cancelSession(sessionId);
        await loadSessions();
      } catch (err) {
        console.error('Failed to cancel session:', err);
      }
    },
    [loadSessions]
  );

  return {
    // Selection state
    selectedDate,
    setSelectedDate,
    slots,
    selectedSlot,
    setSelectedSlot,
    dayOfWeekIndex,
    isLoadingSlots,

    // Sessions & Availability
    sessions,
    bookedSessionsForDate,
    isLoadingSessions,
    isSlotBooked,
    getSlotBooking,

    // Form state
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

    // Converted time & Copy
    convertedTime,
    handleCopyMessage,
    isMessageCopied: isCopied('onboarding-slot-message'),

    // Booking actions
    bookCurrentSlot,
    cancelBooking,
    isBooking,
    bookingError,
    bookingSuccessMessage,
    clearMessages: () => {
      setBookingError(null);
      setBookingSuccessMessage(null);
    },
  };
}
