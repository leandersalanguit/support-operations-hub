/**
 * @file clipboard.ts
 * @description Safe clipboard utility with navigator.clipboard support,
 * legacy textarea fallback, safe text reading, and React hook for copy feedback.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Copies the given text to the system clipboard.
 * Uses the modern Clipboard API when available in a secure context,
 * falling back to an off-screen textarea with document.execCommand('copy').
 *
 * @param {string} text - The text string to copy.
 * @returns {Promise<boolean>} Resolves to true if copying succeeded, false otherwise.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    if (typeof document === 'undefined') {
      return false;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Reads plain text from the system clipboard safely.
 * Returns null if permissions are denied or unsupported.
 *
 * @returns {Promise<string | null>} The clipboard text or null if unavailable.
 */
export async function readTextFromClipboard(): Promise<string | null> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      const text = await navigator.clipboard.readText();
      return text ?? null;
    }
    return null;
  } catch {
    // Browser permission prompt denied or unsupported
    return null;
  }
}

export interface UseClipboardCopyResult {
  /** The ID or text of the most recently copied item (null if none active or timer expired) */
  copiedId: string | null;
  /** Helper to check if a specific ID is currently showing the copied confirmation */
  isCopied: (id: string) => boolean;
  /** Function to trigger copying text and start the feedback timer */
  copy: (text: string, id?: string) => Promise<boolean>;
  /** Manually clear the copied state */
  reset: () => void;
}

/**
 * React hook to manage clipboard copying with auto-resetting feedback state and unmount timer cleanup.
 *
 * @param {number} durationMs - Time in milliseconds to show copy feedback (default: 2000ms).
 * @returns {UseClipboardCopyResult} Clipboard copy controls and state.
 */
export function useClipboardCopy(durationMs = 2000): UseClipboardCopyResult {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCopiedId(null);
  }, []);

  const copy = useCallback(
    async (text: string, id?: string): Promise<boolean> => {
      const targetId = id !== undefined ? id : text;
      const success = await copyTextToClipboard(text);

      if (success) {
        setCopiedId(targetId);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setCopiedId((prev) => (prev === targetId ? null : prev));
        }, durationMs);
      }

      return success;
    },
    [durationMs]
  );

  const isCopied = useCallback((id: string) => copiedId === id, [copiedId]);

  return { copiedId, isCopied, copy, reset };
}
