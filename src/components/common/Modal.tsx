/**
 * @file Modal.tsx
 * @description Unified, accessible modal dialog primitive with portal mounting,
 * scroll locking, Escape key handling, and standardized header/body/footer layouts.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AppLogo } from '../AppLogo';

export type ModalMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

const MAX_WIDTH_CLASSES: Record<ModalMaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

export interface ModalProps {
  /** Controls whether the modal is visible */
  isOpen: boolean;
  /** Invoked when the modal requests to close (via X button, Escape key, or backdrop click) */
  onClose: () => void;
  /** Maximum width preset for modal container */
  maxWidth?: ModalMaxWidth;
  /** Maximum height preset or custom Tailwind class (default: 'max-h-[min(94vh,calc(100dvh-2rem))]') */
  maxHeight?: string;
  /** Whether pressing the Escape key closes the modal (default: true) */
  closeOnEscape?: boolean;
  /** Whether clicking the backdrop overlay closes the modal (default: false) */
  closeOnBackdropClick?: boolean;
  /** Custom class for the inner card container */
  className?: string;
  /** Children elements inside the modal */
  children: React.ReactNode;
  /** Optional accessible ID for aria-labelledby */
  ariaLabelledBy?: string;
}

export interface ModalHeaderProps {
  /** Title text or node */
  title: React.ReactNode;
  /** Optional subtitle or description text below the title */
  subtitle?: React.ReactNode;
  /** Optional icon element on the left */
  icon?: React.ReactNode;
  /** Show application logo as the left icon */
  showAppLogo?: boolean;
  /** Callback when close (X) button is clicked. If not provided, close button is omitted */
  onClose?: () => void;
  /** Header visual style: 'branded' (dark contrast banner) or 'clean' (subtle light/dark) */
  variant?: 'branded' | 'clean';
  /** Additional custom class */
  className?: string;
}

export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Branded or clean header component for modals.
 */
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  icon,
  showAppLogo = false,
  onClose,
  variant = 'branded',
  className = '',
}) => {
  if (variant === 'clean') {
    return (
      <div
        className={`flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 ${className}`}
      >
        <div className="flex items-center gap-2.5">
          {showAppLogo ? (
            <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <AppLogo iconOnly className="w-5 h-5" />
            </div>
          ) : icon ? (
            <div className="p-1.5 rounded-lg bg-fotoblue-100 dark:bg-fotoblue-950 text-fotoblue-700 dark:text-fotoblue-300">
              {icon}
            </div>
          ) : null}
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-slate-900 dark:bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 dark:border-slate-800 ${className}`}
    >
      <div className="flex items-center gap-3">
        {showAppLogo ? (
          <div className="p-1.5 rounded-xl bg-slate-800/80 dark:bg-slate-800 border border-slate-700/70 dark:border-slate-700 flex items-center justify-center">
            <AppLogo iconOnly className="w-5 h-5" />
          </div>
        ) : icon ? (
          <div className="p-2 rounded-xl bg-fotoblue-600/20 text-fotoblue-400 border border-fotoblue-500/30 flex items-center justify-center">
            {icon}
          </div>
        ) : null}
        <div>
          <h3 className="text-base font-bold text-white leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

/**
 * Standard content container for modal bodies.
 */
export const ModalBody: React.FC<ModalBodyProps> = ({ children, className = '' }) => {
  return <div className={`p-6 overflow-y-auto flex-1 min-h-0 ${className}`}>{children}</div>;
};

/**
 * Standard footer container for modal actions.
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-slate-50 dark:bg-slate-800/80 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0 ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Main Modal component. Handles portal rendering, backdrop overlay,
 * scroll locking, and Escape key listeners.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  maxWidth = 'md',
  maxHeight,
  closeOnEscape = true,
  closeOnBackdropClick = false,
  className = '',
  children,
  ariaLabelledBy,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Lock document body scroll when modal is active
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = MAX_WIDTH_CLASSES[maxWidth] || MAX_WIDTH_CLASSES.md;
  const heightClass = maxHeight || 'max-h-[min(94vh,calc(100dvh-2rem))]';

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={`w-full ${maxWidthClass} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fadeIn flex flex-col ${heightClass} my-auto ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
