/**
 * @fileoverview Tailwind CSS configuration.
 * Extends the default theme with modern operational palettes:
 * - primary: Cyan / Sky blue operational theme
 * - primary-deep / fotodeep: Deep navy operational contrast
 * - primary-teal / fototeal: Mint / Teal operational accent
 * Backward-compatible aliases (fotoblue, fototeal, fotodeep) are retained.
 */

const primaryPalette = {
  50: '#f0faff',
  100: '#e0f4fe',
  200: '#b9eafc',
  300: '#7dd8fa',
  400: '#2dc3e8',
  500: '#00addc', // Primary Accent Cyan
  600: '#008bb5',
  700: '#006e91',
  800: '#065b77',
  900: '#0a4c64',
  950: '#043142',
};

const tealPalette = {
  50: '#effcf6',
  100: '#d7f7e9',
  200: '#b2efd6',
  300: '#7ee2be',
  400: '#3bc1ca',
  500: '#46bea5', // Mint Teal Accent
  600: '#2da38b',
  700: '#268270',
  800: '#22675b',
  900: '#1f554c',
  950: '#0c322d',
};

const deepPalette = {
  50: '#f0f8ff',
  100: '#e0f0fe',
  200: '#bae0fd',
  300: '#7cc7fb',
  400: '#26aae8',
  500: '#1c9ad6', // Deep Blue Accent
  600: '#117eb3',
  700: '#0e6592',
  800: '#105579',
  900: '#134765',
  950: '#0c2e43',
};

/** @type {import('tailwindcss').Config} */
export default {
  // Enable class-based dark mode
  darkMode: 'class',
  // Define files to scan for Tailwind utility classes
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: primaryPalette,
        fotoblue: primaryPalette,
        fototeal: tealPalette,
        fotodeep: deepPalette,
      },
    },
  },
  plugins: [],
}
