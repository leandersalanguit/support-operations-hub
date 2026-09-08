/**
 * @file ExpandableDescription.tsx
 * @description Reusable expandable description component for resource directory cards.
 * Displays a 2-line clamped preview with a native hover tooltip and smooth ease-in/ease-out
 * height transition when expanding or collapsing with 'Read more / Show less'.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ExpandableDescriptionProps {
  text?: string;
  maxChars?: number;
  collapsedHeightPx?: number;
  className?: string;
}

export const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({
  text,
  maxChars = 90,
  collapsedHeightPx = 40,
  className = 'mb-3',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measureHeight = () => {
      if (el) {
        setContentHeight(el.scrollHeight);
      }
    };

    measureHeight();

    const resizeObserver = new ResizeObserver(measureHeight);
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [text]);

  if (!text) return null;

  // Determine if content is long enough to need truncation and toggle
  const isLong = (contentHeight > 0 ? contentHeight > collapsedHeightPx + 4 : text.length > maxChars) || text.includes('\n');

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contentHeight && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed ${className}`}>
      {/* Animated Height Container */}
      <div
        className="relative overflow-hidden transition-[max-height] duration-300 ease-in-out cursor-default"
        style={{
          maxHeight: isLong
            ? isExpanded
              ? `${contentHeight || 300}px`
              : `${collapsedHeightPx}px`
            : undefined,
        }}
        onClick={!isExpanded && isLong ? toggleExpand : undefined}
      >
        <p
          ref={contentRef}
          className={`leading-relaxed select-text ${!isExpanded && isLong ? 'cursor-pointer' : ''}`}
          title={isExpanded ? undefined : text}
        >
          {text}
        </p>

        {/* Subtle Fade Gradient overlay when collapsed */}
        {isLong && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-slate-900 to-transparent transition-opacity duration-300 ease-in-out ${
              isExpanded ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}
      </div>

      {/* Read More / Show Less Toggle Button */}
      {isLong && (
        <button
          type="button"
          onClick={toggleExpand}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-fotoblue-600 dark:text-fotoblue-400 hover:text-fotoblue-800 dark:hover:text-fotoblue-300 transition-colors mt-1 cursor-pointer select-none focus:outline-hidden group"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Show less description' : 'Read more description'}
        >
          <span>{isExpanded ? 'Show less' : 'Read more'}</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-300 ease-in-out ${
              isExpanded ? 'rotate-180 text-fotoblue-700 dark:text-fotoblue-300' : 'rotate-0 text-fotoblue-500 dark:text-fotoblue-400 group-hover:translate-y-0.5'
            }`}
          />
        </button>
      )}
    </div>
  );
};
