/**
 * @file PasteExcelModal.tsx
 * @description Modal dialog for pasting and previewing a single row copied from an external Excel sheet.
 * Includes Excel row-copying instructions, live parsing preview, and auto-formatting.
 */

import React, { useState, useEffect } from 'react';
import { ClipboardPaste, Check, AlertCircle, Lightbulb, Phone, MessageSquare, ArrowRight } from 'lucide-react';
import { parseExcelRow, ParsedExcelRow } from '../utils/importParser';
import { STATUS_OPTIONS } from '../types';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './common';

import { useTaxonomies } from '../application/useTaxonomies';
import { readTextFromClipboard } from '../utils/clipboard';
import { toDisplayLabel } from '../domain/interaction/license';

interface PasteExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: ParsedExcelRow) => void;
  initialText?: string;
}

export const PasteExcelModal: React.FC<PasteExcelModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialText = '',
}) => {
  const { products, classifications } = useTaxonomies();
  const [pasteText, setPasteText] = useState<string>(initialText);
  const [parsedResult, setParsedResult] = useState<ParsedExcelRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initialText and parse when modal opens
  useEffect(() => {
    if (isOpen) {
      setPasteText(initialText);
      if (initialText.trim()) {
        const { data, error } = parseExcelRow(initialText, products, classifications);
        setParsedResult(data);
        setErrorMessage(error);
      } else {
        setParsedResult(null);
        setErrorMessage(null);
      }
    }
  }, [isOpen, initialText, products, classifications]);

  // Handle changes in the paste textarea
  const handleTextChange = (text: string) => {
    setPasteText(text);
    if (!text.trim()) {
      setParsedResult(null);
      setErrorMessage(null);
      return;
    }
    const { data, error } = parseExcelRow(text, products, classifications);
    setParsedResult(data);
    setErrorMessage(error);
  };

  // Try reading directly from clipboard if button is clicked
  const handleReadClipboard = async () => {
    const text = await readTextFromClipboard();
    if (text) {
      handleTextChange(text);
    }
  };

  const handleConfirmApply = () => {
    if (parsedResult) {
      onApply(parsedResult);
      onClose();
    }
  };

  if (!isOpen) return null;

  const statusMeta = parsedResult
    ? STATUS_OPTIONS.find((s) => s.label === parsedResult.status) || STATUS_OPTIONS[0]
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      {/* Modal Header */}
      <ModalHeader
        title="Paste Interaction from Excel"
        subtitle="Import a single row copied from your spreadsheet"
        icon={<ClipboardPaste className="w-5 h-5" />}
        onClose={onClose}
      />

      <ModalBody className="space-y-4">
          {/* Pro-Tip Box */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <span className="font-bold">Pro-Tip for Excel:</span> In Excel, <strong>right-click the row number</strong> on the far left and choose <strong>Copy</strong> (or press <kbd className="px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/80 font-mono font-bold text-[11px]">Ctrl+C</kbd>) to ensure all 13 columns are copied accurately without missing cells.
            </div>
          </div>

          {/* Paste Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Excel Row (Tab-Separated Data)
              </label>
              <button
                type="button"
                onClick={handleReadClipboard}
                className="text-xs text-fotoblue-600 dark:text-fotoblue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste from Clipboard</span>
              </button>
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Right-click row number in Excel -> Copy, then paste here (Ctrl+V)..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-fotoblue-500 focus:border-fotoblue-500 transition-all resize-none shadow-2xs"
            />
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Cannot parse row:</span> {errorMessage}
              </div>
            </div>
          )}

          {/* Live Parsed Preview */}
          {parsedResult && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>Row Parsed Successfully! Ready to apply.</span>
                </div>
                {statusMeta && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusMeta.badgeBg} ${statusMeta.badgeBorder}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotColor}`} />
                    {parsedResult.status}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date & Day</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {parsedResult.date} ({parsedResult.dayOfWeek})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Client</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block" title={parsedResult.clientName}>
                    {parsedResult.clientName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Channel & Details</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    {parsedResult.channel === 'Call' ? (
                      <>
                        <Phone className="w-3 h-3 text-fotoblue-500" />
                        <span className="font-mono text-fotoblue-600 dark:text-fotoblue-400">
                          {parsedResult.phoneDetail || 'Call'}
                        </span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3 h-3 text-purple-500" />
                        <span className="font-mono text-purple-600 dark:text-purple-400">
                          {parsedResult.chatTicketDetail || 'Chat'}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Product</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {parsedResult.clientProduct}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Classification</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {parsedResult.caseClassification}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Support License</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {toDisplayLabel(parsedResult.license)}
                  </span>
                </div>
              </div>

              {parsedResult.additionalNotes && (
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Notes</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 line-clamp-2">
                    "{parsedResult.additionalNotes}"
                  </p>
                </div>
              )}
            </div>
          )}
      </ModalBody>

      {/* Modal Footer */}
      <ModalFooter className="justify-between">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!parsedResult}
          onClick={handleConfirmApply}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
            parsedResult
              ? 'bg-fotoblue-600 hover:bg-fotoblue-700 text-white cursor-pointer active:scale-98'
              : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Apply to Form</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </ModalFooter>
    </Modal>
  );
};
