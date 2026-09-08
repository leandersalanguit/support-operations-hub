/**
 * @file useListKeyboardNavigation.ts
 * @description Reusable React hook for circular keyboard navigation (Tab looping, ArrowUp/ArrowDown, Enter, Escape)
 * across dropdown lists, autocompletes, and popover menus.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Finds the nearest scrollable ancestor element.
 */
export function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (typeof window === 'undefined') return null;
  let parent = node?.parentElement;
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

/**
 * Ensures an item is visible within its scrollable container without snapping it to the middle.
 * When navigating downward, it aligns the item cleanly at the bottom edge.
 * When navigating upward, it aligns the item cleanly at the top edge.
 */
export function scrollItemIntoContainer(
  item: HTMLElement,
  container?: HTMLElement | null,
  padding = 6
): void {
  const scrollContainer = container || getScrollParent(item);
  if (!scrollContainer) return;

  const itemRect = item.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();

  // If item is partially or fully below the visible bottom of the container,
  // scroll down JUST enough to bring it into view at the bottom edge
  if (itemRect.bottom > containerRect.bottom - padding) {
    const overflowDistance = itemRect.bottom - (containerRect.bottom - padding);
    scrollContainer.scrollTop += overflowDistance;
  }
  // If item is partially or fully above the visible top of the container,
  // scroll up JUST enough to bring it into view at the top edge
  else if (itemRect.top < containerRect.top + padding) {
    const underflowDistance = (containerRect.top + padding) - itemRect.top;
    scrollContainer.scrollTop -= underflowDistance;
  }
}

/**
 * Computes the next circular index in a list of items.
 * Supports forward ('next') and backward ('prev') wrapping.
 *
 * @param currentIndex Current index (-1 if none active)
 * @param itemCount Total number of items
 * @param direction Navigation direction ('next' | 'prev')
 */
export function getLoopedIndex(
  currentIndex: number,
  itemCount: number,
  direction: 'next' | 'prev' = 'next'
): number {
  if (itemCount <= 0) return -1;
  if (direction === 'prev') {
    return currentIndex <= 0 ? itemCount - 1 : currentIndex - 1;
  }
  return currentIndex >= itemCount - 1 ? 0 : currentIndex + 1;
}

export interface UseListKeyboardNavigationOptions {
  /** Total number of selectable items currently in the list */
  itemCount: number;
  /** Whether the dropdown / menu is open */
  isOpen: boolean;
  /** Callback fired when an item is selected via Enter or Space */
  onSelect?: (index: number) => void;
  /** Callback fired when the list should close (e.g. Escape) */
  onClose?: () => void;
  /** Ref to the trigger element (input or button) to return focus to upon closing */
  triggerRef?: React.RefObject<HTMLElement | null>;
  /** Optional ref to the scrollable container element */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  /** Default active index when opening (defaults to 0 or -1 if closed) */
  initialIndex?: number;
}

export interface UseListKeyboardNavigationReturn<TElement extends HTMLElement = HTMLElement> {
  /** Currently highlighted / active item index */
  activeIndex: number;
  /** Setter for activeIndex */
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  /** Ref array holding DOM references to item elements */
  itemRefs: React.MutableRefObject<(TElement | null)[]>;
  /** KeyDown event handler to attach to container or list element */
  handleKeyDown: (e: React.KeyboardEvent) => void;
  /** Programmatically focus and scroll a specific item index into view without centering */
  focusItem: (index: number) => void;
  /** Return focus to the trigger element */
  focusTrigger: () => void;
  /** Reset active index to -1 */
  resetActiveIndex: () => void;
}

export function useListKeyboardNavigation<TElement extends HTMLElement = HTMLElement>({
  itemCount,
  isOpen,
  onSelect,
  onClose,
  triggerRef,
  scrollContainerRef,
  initialIndex = 0,
}: UseListKeyboardNavigationOptions): UseListKeyboardNavigationReturn<TElement> {
  const [activeIndex, setActiveIndex] = useState<number>(isOpen ? initialIndex : -1);
  const itemRefs = useRef<(TElement | null)[]>([]);

  // Keep itemRefs array size aligned with itemCount
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, itemCount);
  }, [itemCount]);

  // Sync activeIndex when opening/closing
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(initialIndex >= 0 && initialIndex < itemCount ? initialIndex : 0);
    } else {
      setActiveIndex(-1);
    }
  }, [isOpen, initialIndex, itemCount]);

  // Scroll active item into view cleanly at the edges without snapping to the middle
  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      const el = itemRefs.current[activeIndex];
      if (el) {
        const container = scrollContainerRef?.current || getScrollParent(el);
        if (container) {
          if (activeIndex === 0) {
            container.scrollTop = 0;
          } else if (activeIndex === itemCount - 1) {
            container.scrollTop = container.scrollHeight;
          } else {
            scrollItemIntoContainer(el, container);
          }
        }
      }
    }
  }, [isOpen, activeIndex, itemCount, scrollContainerRef]);

  const focusItem = useCallback(
    (index: number) => {
      if (index >= 0 && index < itemCount) {
        const el = itemRefs.current[index];
        if (el) {
          // Use preventScroll: true to avoid the browser's default behavior of centering the focused element
          try {
            el.focus({ preventScroll: true });
          } catch {
            el.focus();
          }

          const container = scrollContainerRef?.current || getScrollParent(el);
          if (container) {
            if (index === 0) {
              container.scrollTop = 0;
            } else if (index === itemCount - 1) {
              container.scrollTop = container.scrollHeight;
            } else {
              scrollItemIntoContainer(el, container);
            }
          }
        }
      }
    },
    [itemCount, scrollContainerRef]
  );

  const focusTrigger = useCallback(() => {
    triggerRef?.current?.focus();
  }, [triggerRef]);

  const resetActiveIndex = useCallback(() => {
    setActiveIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || itemCount === 0) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        const direction = e.shiftKey ? 'prev' : 'next';
        const nextIdx = getLoopedIndex(activeIndex, itemCount, direction);
        setActiveIndex(nextIdx);
        focusItem(nextIdx);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const baseIndex = activeIndex >= 0 ? activeIndex : (initialIndex >= 0 && initialIndex < itemCount ? initialIndex : 0);
        const nextIdx = getLoopedIndex(baseIndex, itemCount, 'next');
        setActiveIndex(nextIdx);
        focusItem(nextIdx);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const baseIndex = activeIndex >= 0 ? activeIndex : (initialIndex >= 0 && initialIndex < itemCount ? initialIndex : 0);
        const nextIdx = getLoopedIndex(baseIndex, itemCount, 'prev');
        setActiveIndex(nextIdx);
        focusItem(nextIdx);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (activeIndex >= 0 && activeIndex < itemCount) {
          e.preventDefault();
          onSelect?.(activeIndex);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        focusTrigger();
      }
    },
    [isOpen, itemCount, activeIndex, onSelect, onClose, focusItem, focusTrigger]
  );

  return {
    activeIndex,
    setActiveIndex,
    itemRefs,
    handleKeyDown,
    focusItem,
    focusTrigger,
    resetActiveIndex,
  };
}
