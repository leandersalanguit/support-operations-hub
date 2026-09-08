/**
 * @file AppLogo.tsx
 * @description Generic SVG logo component for the Support Operations Hub.
 * Supports rendering just the operations emblem icon or the full brand logo (icon + wordmark).
 * Allows inverting text color for dark mode backgrounds.
 */

import React from 'react';

/**
 * Props for the AppLogo component.
 */
export interface AppLogoProps {
  /** Optional CSS classes for styling the SVG container. Defaults to 'h-8 w-auto'. */
  className?: string;
  /** If true, renders only the shield/headset operational emblem icon. Defaults to false. */
  iconOnly?: boolean;
  /** If true, changes the wordmark text fill color to white for dark backgrounds. Defaults to false. */
  invertedText?: boolean;
}

/**
 * SVG component representing the Support Operations Hub brand.
 * Can be configured to show only the icon, and adjust text color for dark/light themes.
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  className = 'h-8 w-auto',
  iconOnly = false,
  invertedText = false,
}) => {
  if (iconOnly) {
    // Renders just the operational shield & support emblem
    return (
      <svg
        viewBox="0 0 100 100"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="appLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dc3e8" />
            <stop offset="50%" stopColor="#00addc" />
            <stop offset="100%" stopColor="#1c9ad6" />
          </linearGradient>
        </defs>
        {/* Modern rounded hexagon shield */}
        <polygon
          points="50,4 90,25 90,75 50,96 10,75 10,25"
          fill="url(#appLogoGrad)"
          stroke="#008bb5"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Inner support headset / hub icon */}
        <path
          d="M32 50 C32 38, 68 38, 68 50 V60 C68 64, 64 68, 60 68 H54 M68 52 H64 C62 52, 60 54, 60 56 V62 C60 64, 62 66, 64 66 H68 Z M32 52 H36 C38 52, 40 54, 40 56 V62 C40 64, 38 66, 36 66 H32 Z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="68" r="3.5" fill="#ffffff" />
      </svg>
    );
  }

  // Renders the full logo (icon + SUPPORT OPERATIONS HUB wordmark)
  return (
    <svg
      viewBox="0 0 420 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="appLogoGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dc3e8" />
          <stop offset="50%" stopColor="#00addc" />
          <stop offset="100%" stopColor="#1c9ad6" />
        </linearGradient>
      </defs>
      {/* Icon Emblem */}
      <polygon
        points="50,4 90,25 90,75 50,96 10,75 10,25"
        fill="url(#appLogoGradFull)"
        stroke="#008bb5"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M32 50 C32 38, 68 38, 68 50 V60 C68 64, 64 68, 60 68 H54 M68 52 H64 C62 52, 60 54, 60 56 V62 C60 64, 62 66, 64 66 H68 Z M32 52 H36 C38 52, 40 54, 40 56 V62 C40 64, 38 66, 36 66 H32 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="68" r="3.5" fill="#ffffff" />

      {/* Wordmark */}
      <g fill={invertedText ? '#ffffff' : '#0f172a'}>
        <text
          x="112"
          y="48"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          fontSize="24"
          letterSpacing="0.08em"
        >
          SUPPORT
        </text>
        <text
          x="112"
          y="76"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="700"
          fontSize="17"
          letterSpacing="0.14em"
          fill="#00addc"
        >
          OPERATIONS HUB
        </text>
      </g>
    </svg>
  );
};
