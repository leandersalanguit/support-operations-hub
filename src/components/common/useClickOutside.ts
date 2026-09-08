import { useEffect, RefObject } from 'react';

export interface UseClickOutsideOptions {
  /** Controls whether event listeners are active (typically your `isOpen` state). Defaults to true. */
  enabled?: boolean;
  /** Whether pressing the Escape key should also trigger the callback. Defaults to false. */
  closeOnEscape?: boolean;
}

/**
 * React hook that triggers a callback when a click or touch occurs outside of the referenced element,
 * with optional Escape key support and automatic event listener cleanup.
 *
 * @param ref - A React ref or array of refs to target element(s).
 * @param onDismiss - Callback invoked when a click/touch outside or Escape press occurs.
 * @param options - Configuration options for enabling/disabling listeners and Escape handling.
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null> | Array<RefObject<T | null>>,
  onDismiss: () => void,
  options: UseClickOutsideOptions = {}
): void {
  const { enabled = true, closeOnEscape = false } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const refs = Array.isArray(ref) ? ref : [ref];
      const clickedInside = refs.some((r) => r.current && r.current.contains(target));

      if (!clickedInside) {
        onDismiss();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    if (closeOnEscape) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      if (closeOnEscape) {
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [ref, onDismiss, enabled, closeOnEscape]);
}
