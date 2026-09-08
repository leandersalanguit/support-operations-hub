/**
 * @file theme.ts
 * @description Manages light and dark theme mode state, persistence to localStorage,
 * and synchronization with documentElement classList and OS preferences.
 */

import { useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'fm_support_hub_theme';

/**
 * Retrieves the initial theme mode.
 * Checks localStorage first, defaulting to 'light' mode.
 */
export const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';

  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch (err) {
    console.warn('Failed to read theme preference from localStorage:', err);
  }

  return 'light';
};

/**
 * Applies the given theme mode to the document DOM element and persists it to localStorage.
 *
 * @param {ThemeMode} theme - The theme mode to apply ('light' | 'dark').
 */
export const applyTheme = (theme: ThemeMode): void => {
  if (typeof window === 'undefined') return;

  try {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (err) {
    console.warn('Failed to save theme preference to localStorage:', err);
  }
};

/**
 * Custom hook to manage theme state, persistence, and DOM class synchronization.
 */
export const useTheme = (): {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: React.Dispatch<React.SetStateAction<ThemeMode>>;
} => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const initial = getInitialTheme();
    applyTheme(initial);
    return initial;
  });

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  const setTheme = useCallback((action: React.SetStateAction<ThemeMode>) => {
    setThemeState((prev) => {
      const nextTheme = typeof action === 'function' ? action(prev) : action;
      applyTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  return { theme, toggleTheme, setTheme };
};
