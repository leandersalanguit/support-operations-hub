/**
 * @file scroll.ts
 * @description Smooth scrolling utilities using requestAnimationFrame and cubic easing.
 */

import { useRef, useEffect, useCallback } from 'react';

/**
 * Cubic ease-in-out calculation for smooth viewport deceleration.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface SmoothScrollOptions {
  /** Animation duration in milliseconds (default: 650) */
  duration?: number;
  /** Optional callback fired when the animation completes */
  onComplete?: () => void;
}

/**
 * Smoothly animates window scroll position to the target Y coordinate.
 *
 * @param {number} targetY - The destination scroll position in pixels.
 * @param {SmoothScrollOptions} [options] - Configuration options.
 * @returns {() => void} A cancellation function to abort the animation if needed.
 */
export function smoothScrollTo(targetY: number, options: SmoothScrollOptions = {}): () => void {
  if (typeof window === 'undefined') return () => {};

  const { duration = 650, onComplete } = options;
  const startY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
  const distance = targetY - startY;

  if (Math.abs(distance) < 10) {
    window.scrollTo(0, targetY);
    onComplete?.();
    return () => {};
  }

  let animId: number | null = null;
  let startTime: number | null = null;

  const step = (currentTime: number) => {
    if (!startTime) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeInOutCubic(progress);

    window.scrollTo(0, startY + distance * ease);

    if (progress < 1) {
      animId = requestAnimationFrame(step);
    } else {
      animId = null;
      onComplete?.();
    }
  };

  animId = requestAnimationFrame(step);

  return () => {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  };
}

/**
 * Smoothly scrolls the window to the very top of the page.
 *
 * @param {number} [duration=650] - Animation duration in milliseconds.
 * @param {() => void} [onComplete] - Callback on completion.
 * @returns {() => void} Cancellation function.
 */
export function scrollToTopSmooth(duration = 650, onComplete?: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const startY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
  if (startY < 10) {
    onComplete?.();
    return () => {};
  }
  return smoothScrollTo(0, { duration, onComplete });
}

/**
 * Smoothly scrolls the window to bring a target element (e.g., pagination footer) or bottom of document into view.
 *
 * @param {HTMLElement | null} [targetElement] - Optional element whose bottom should be aligned into view.
 * @param {number} [duration=650] - Animation duration in milliseconds.
 * @param {() => void} [onComplete] - Callback on completion.
 * @returns {() => void} Cancellation function.
 */
export function scrollToBottomSmooth(
  targetElement?: HTMLElement | null,
  duration = 650,
  onComplete?: () => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  let targetY = maxScrollY;
  if (targetElement) {
    const rect = targetElement.getBoundingClientRect();
    targetY = Math.min(maxScrollY, Math.max(0, rect.bottom + window.scrollY - window.innerHeight + 16));
  }

  return smoothScrollTo(targetY, {
    duration,
    onComplete: () => {
      targetElement?.focus({ preventScroll: true });
      onComplete?.();
    },
  });
}

export interface ScrollToElementOptions extends SmoothScrollOptions {
  /** Top offset in pixels (e.g. to accommodate a sticky navbar, default: 80) */
  offset?: number;
}

/**
 * Smoothly scrolls the window so that the target element is visible below the specified offset.
 *
 * @param {HTMLElement | null} element - The target DOM element to scroll into view.
 * @param {ScrollToElementOptions} [options] - Configuration options.
 * @returns {() => void} Cancellation function.
 */
export function scrollToElement(
  element: HTMLElement | null,
  options: ScrollToElementOptions = {}
): () => void {
  if (typeof window === 'undefined' || !element) return () => {};

  const { offset = 80, duration = 700, onComplete } = options;
  const elementPosition = element.getBoundingClientRect().top;
  const targetScrollY = Math.max(
    0,
    elementPosition + (window.scrollY || window.pageYOffset) - offset
  );

  return smoothScrollTo(targetScrollY, { duration, onComplete });
}

export interface UseSmoothScrollOptions extends ScrollToElementOptions {
  /** Delay in milliseconds before executing the scroll (default: 100ms) */
  delay?: number;
  /** Whether to automatically blur the currently active element (default: true) */
  blurActiveElement?: boolean;
}

/**
 * React hook to manage smooth scrolling to an attached target ref with debounce and unmount cleanup.
 */
export function useSmoothScrollToElement<T extends HTMLElement = HTMLDivElement>(
  options: UseSmoothScrollOptions = {}
) {
  const targetRef = useRef<T>(null);
  const cancelScrollRef = useRef<(() => void) | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cancelScrollRef.current) cancelScrollRef.current();
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const triggerScroll = useCallback(() => {
    const { delay = 100, blurActiveElement = true, offset = 80, duration = 700, onComplete } = options;

    if (
      blurActiveElement &&
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }

    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }

    scrollTimerRef.current = setTimeout(() => {
      if (targetRef.current) {
        if (cancelScrollRef.current) cancelScrollRef.current();
        cancelScrollRef.current = scrollToElement(targetRef.current, {
          offset,
          duration,
          onComplete,
        });
      }
    }, delay);
  }, [options]);

  return { targetRef, triggerScroll };
}
