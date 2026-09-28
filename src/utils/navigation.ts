/**
 * @file navigation.ts
 * @description Reusable navigation utilities and custom hooks for managing
 * collapsible sidebar menus, active group resolution, and flyout popovers.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Checks whether the currently active tab belongs to a specific navigation group.
 */
export function isTabInGroup(activeTab: string, groupKeys: readonly string[]): boolean {
  if (!activeTab || !groupKeys || groupKeys.length === 0) return false;
  return groupKeys.includes(activeTab);
}

export interface UseExpandableNavGroupOptions {
  /** Initial expansion state (default: false) */
  initialOpen?: boolean;
  /** Keys of the child tabs that belong to this navigation group */
  groupKeys: readonly string[];
  /** Key of the currently active tab */
  activeTab: string;
  /** Whether the parent container/sidebar is collapsed */
  isCollapsed?: boolean;
}

export interface UseExpandableNavGroupReturn {
  /** Whether the submenu is currently open/expanded */
  isOpen: boolean;
  /** Explicitly set the open/closed state */
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** Toggle the open/closed state */
  toggleOpen: () => void;
  /** Whether any child tab in this group is currently active */
  isActive: boolean;
}

/**
 * Custom React hook managing expandable navigation group state with auto-opening
 * when any of its child items are navigated to.
 */
export function useExpandableNavGroup({
  initialOpen = false,
  groupKeys,
  activeTab,
  isCollapsed = false,
}: UseExpandableNavGroupOptions): UseExpandableNavGroupReturn {
  const isActive = useMemo(() => isTabInGroup(activeTab, groupKeys), [activeTab, groupKeys]);

  const [isOpen, setIsOpen] = useState<boolean>(() => initialOpen || isActive);

  // Auto-expand group when a child tab becomes active (if expanded mode)
  useEffect(() => {
    if (isActive && !isCollapsed) {
      setIsOpen(true);
    }
  }, [isActive, isCollapsed]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    setIsOpen,
    toggleOpen,
    isActive,
  };
}
