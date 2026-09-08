/**
 * @file ConfirmModal.tsx
 * @description Standardized confirmation and destructive action modal dialog.
 * Unifies confirmation dialogs across the application with accessible focus,
 * customizable variant styles (danger/warning/info), and loading states.
 */

import React from 'react';
import { AlertTriangle, Trash2, Info, Loader2 } from 'lucide-react';
import { Modal, ModalBody, ModalMaxWidth } from './Modal';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Invoked when cancelled or closed */
  onClose: () => void;
  /** Invoked when confirm action is triggered */
  onConfirm: () => void;
  /** Dialog heading */
  title: string;
  /** Explanatory description */
  description?: string | React.ReactNode;
  /** Confirmation button label (default: 'Confirm') */
  confirmText?: string;
  /** Cancel button label (default: 'Cancel') */
  cancelText?: string;
  /** Color theme variant (default: 'danger') */
  variant?: ConfirmVariant;
  /** Optional custom icon element */
  icon?: React.ReactNode;
  /** Optional extra body content (e.g. details summary card) */
  children?: React.ReactNode;
  /** Loading state indicator for async confirmation */
  isLoading?: boolean;
  /** Maximum width preset (default: 'sm') */
  maxWidth?: ModalMaxWidth;
  /** Layout style: 'centered' (icon centered on top) or 'inline' (icon aligned left) */
  layout?: 'centered' | 'inline';
}

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  {
    iconBg: string;
    iconColor: string;
    confirmBtn: string;
    defaultIcon: React.ReactNode;
  }
> = {
  danger: {
    iconBg: 'bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800',
    iconColor: 'text-rose-600 dark:text-rose-400',
    confirmBtn:
      'bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs',
    defaultIcon: <Trash2 className="w-5 h-5" />,
  },
  warning: {
    iconBg: 'bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
    confirmBtn:
      'bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs',
    defaultIcon: <AlertTriangle className="w-5 h-5" />,
  },
  info: {
    iconBg: 'bg-fotoblue-100 dark:bg-fotoblue-950/60 border border-fotoblue-200 dark:border-fotoblue-800',
    iconColor: 'text-fotoblue-600 dark:text-fotoblue-400',
    confirmBtn:
      'bg-fotoblue-600 hover:bg-fotoblue-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs',
    defaultIcon: <Info className="w-5 h-5" />,
  },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon,
  children,
  isLoading = false,
  maxWidth = 'sm',
  layout = 'centered',
}) => {
  const config = VARIANT_CONFIG[variant];
  const renderedIcon = icon || config.defaultIcon;

  const handleConfirm = () => {
    if (isLoading) return;
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={maxWidth}
      closeOnEscape={!isLoading}
      closeOnBackdropClick={!isLoading}
    >
      <ModalBody className="p-6">
        {layout === 'centered' ? (
          <div className="text-center">
            <div
              className={`w-12 h-12 rounded-2xl ${config.iconBg} ${config.iconColor} flex items-center justify-center mx-auto mb-3.5`}
            >
              {renderedIcon}
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
            {description && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {description}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3.5 mb-2">
            <div
              className={`w-10 h-10 rounded-xl ${config.iconBg} ${config.iconColor} flex items-center justify-center shrink-0`}
            >
              {renderedIcon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
              {description && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {description}
                </div>
              )}
            </div>
          </div>
        )}

        {children && <div className="mt-4">{children}</div>}

        <div
          className={`flex items-center gap-2.5 mt-5 ${
            layout === 'centered' ? 'justify-center' : 'justify-end'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 ${config.confirmBtn}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
};
