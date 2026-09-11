/**
 * @file formNavigation.ts
 * @description Sequential keyboard navigation helper for forms.
 * Enables pressing Enter to advance focus to the next field or button,
 * while preventing unintended form submissions and preserving standard behavior
 * for textareas (e.g. Additional Notes) and submit buttons.
 */

import React from 'react';

/**
 * Focusable element selector for sequential form navigation.
 * Excludes hidden elements, disabled elements, tabindex="-1", and readonly inputs.
 */
export const FORM_FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ');

/**
 * Checks whether an element is visible in the DOM.
 */
export function isElementVisible(el: HTMLElement): boolean {
  if (el.hidden) return false;
  if (el.style.display === 'none' || el.style.visibility === 'hidden') return false;
  if (el.offsetParent === null && el.tagName.toLowerCase() !== 'body') {
    return el.getClientRects().length > 0;
  }
  return true;
}

/**
 * Returns all visible, focusable elements within a container in DOM order.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FORM_FOCUSABLE_SELECTOR));
  return elements.filter(isElementVisible);
}

/**
 * Focuses the next field or button within a form.
 *
 * @param currentElement - The element currently focused.
 * @param form - The enclosing form element.
 * @returns boolean - True if focus was successfully moved.
 */
export function focusNextFormField(
  currentElement: HTMLElement,
  form: HTMLElement
): boolean {
  const focusables = getFocusableElements(form);
  const currentIndex = focusables.findIndex(
    (el) => el === currentElement || el.contains(currentElement)
  );

  if (currentIndex === -1) return false;

  let nextElement: HTMLElement | undefined;

  // If current element is a button inside a multi-button toggle group (e.g. Call/Chat, Yes/No),
  // skip sibling buttons in the same container and advance to the next field outside the group.
  if (currentElement.tagName.toLowerCase() === 'button') {
    const parent = currentElement.parentElement;
    if (parent && parent.querySelectorAll('button').length > 1) {
      nextElement = focusables.slice(currentIndex + 1).find((el) => !parent.contains(el));
    }
  }

  // Otherwise, advance to the immediate next focusable element
  if (!nextElement) {
    nextElement = focusables[currentIndex + 1];
  }

  if (nextElement) {
    try {
      nextElement.focus();
    } catch {
      // Ignore focus errors
    }
    // If text or phone input, select contents for fast typing
    if (
      nextElement instanceof HTMLInputElement &&
      (nextElement.type === 'text' || nextElement.type === 'tel')
    ) {
      nextElement.select?.();
    }
    return true;
  }

  return false;
}

/**
 * Form keydown event handler for Enter navigation.
 * Handles:
 * - Enter on inputs/selects -> advances to next field or button (prevents default form submit)
 * - Enter on toggle buttons -> triggers click and advances to next field outside the toggle group
 * - Enter on textareas (e.g. Additional Notes) -> allowed through (inserts newline)
 * - Enter on submit button -> allowed through (submits form)
 * - Ctrl+Enter / Cmd+Enter -> allowed through or triggers submit callback
 * - ArrowLeft / ArrowRight on toggle buttons -> switches between sibling buttons in the group
 *
 * @param e - The React KeyboardEvent on the form.
 * @param onSubmitShortcut - Optional callback when Ctrl+Enter or Cmd+Enter is pressed.
 */
export function handleFormEnterKeyNavigation(
  e: React.KeyboardEvent<HTMLFormElement>,
  onSubmitShortcut?: () => void
): void {
  // 1. Allow Ctrl+Enter or Cmd+Enter to submit the form from anywhere
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (onSubmitShortcut) {
      e.preventDefault();
      onSubmitShortcut();
    }
    return;
  }

  const target = e.target as HTMLElement | null;
  if (!target) return;

  const tagName = target.tagName.toLowerCase();

  // 2. Handle Arrow keys for toggle button groups (e.g. Call/Chat, Yes/No)
  if (tagName === 'button' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const parent = target.parentElement;
    if (parent) {
      const siblingButtons = Array.from(parent.querySelectorAll<HTMLButtonElement>('button')).filter(isElementVisible);
      if (siblingButtons.length > 1) {
        const currentIdx = siblingButtons.indexOf(target as HTMLButtonElement);
        if (currentIdx !== -1) {
          e.preventDefault();
          const nextIdx =
            e.key === 'ArrowRight'
              ? (currentIdx + 1) % siblingButtons.length
              : (currentIdx - 1 + siblingButtons.length) % siblingButtons.length;
          siblingButtons[nextIdx]?.focus();
          siblingButtons[nextIdx]?.click();
          return;
        }
      }
    }
  }

  // 2b. Handle ArrowUp / ArrowDown between Support License toggle and its sub-menu
  if (tagName === 'button' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    const licenseContainer = target.closest('[data-license-selector]');
    if (licenseContainer) {
      if (e.key === 'ArrowDown') {
        const isToggleBtn = target.hasAttribute('data-license-toggle');
        if (isToggleBtn) {
          const renewalBtn = licenseContainer.querySelector<HTMLButtonElement>(
            'button[data-license-renewal="true"], button[data-tier="renewal_sent"]'
          );
          if (renewalBtn && isElementVisible(renewalBtn)) {
            e.preventDefault();
            renewalBtn.focus();
            return;
          }
          const subMenuBtn = licenseContainer.querySelector<HTMLButtonElement>('[data-license-sub-menu] button');
          if (subMenuBtn && isElementVisible(subMenuBtn)) {
            e.preventDefault();
            subMenuBtn.focus();
            return;
          }
        }
      } else if (e.key === 'ArrowUp') {
        const isSubMenuBtn = target.closest('[data-license-sub-menu]');
        if (isSubMenuBtn) {
          const noBtn = licenseContainer.querySelector<HTMLButtonElement>('button[data-license-toggle="no"]');
          if (noBtn && isElementVisible(noBtn)) {
            e.preventDefault();
            noBtn.focus();
            return;
          }
        }
      }
    }
  }

  // 3. Only handle plain Enter key from this point forward
  if (e.key !== 'Enter' || e.shiftKey || e.altKey) {
    return;
  }

  // 4. If the event was already prevented (e.g. custom autocomplete or dropdown opened), do nothing
  if (e.defaultPrevented) {
    return;
  }

  // 5. Exception: Additional notes area (any textarea in the form)
  // Enter must insert a newline in textareas, so do not intercept
  if (tagName === 'textarea') {
    return;
  }

  // 6. Submit button: pressing Enter on the submit button should submit the form
  if (tagName === 'button' && (target as HTMLButtonElement).type === 'submit') {
    return;
  }

  // 7. Non-submit buttons (toggle buttons, custom buttons)
  if (tagName === 'button') {
    const parent = target.parentElement;

    // Special case for Support License "No" button:
    // Clicking enter on No should move the focus to "Link Sent" / "Renewal Sent" in the sub-menu
    const isLicenseNo =
      target.getAttribute('data-license-toggle') === 'no' ||
      (target.textContent?.trim() === 'No' && Boolean(target.closest('[data-license-selector]')));

    if (isLicenseNo) {
      e.preventDefault();
      (target as HTMLButtonElement).click();

      const focusRenewal = () => {
        const form = e.currentTarget;
        const licenseContainer = target.closest('[data-license-selector]') || form;
        const renewalBtn = licenseContainer.querySelector<HTMLButtonElement>(
          'button[data-license-renewal="true"], button[data-tier="renewal_sent"]'
        );
        if (renewalBtn && isElementVisible(renewalBtn)) {
          renewalBtn.focus();
          return true;
        }

        const subMenuButtons = Array.from(
          licenseContainer.querySelectorAll<HTMLButtonElement>('[data-license-sub-menu] button')
        ).filter(isElementVisible);
        const match =
          subMenuButtons.find((b) => /link|renewal|sent/i.test(b.textContent || '')) ||
          subMenuButtons[1] ||
          subMenuButtons[0];
        if (match) {
          match.focus();
          return true;
        }
        return false;
      };

      if (!focusRenewal()) {
        requestAnimationFrame(() => {
          if (!focusRenewal()) {
            setTimeout(focusRenewal, 10);
          }
        });
      }
      return;
    }

    // Special case for Support License "Yes" button:
    // When Yes is chosen, advance past the entire license container to the next field (In Event)
    const isLicenseYes =
      target.getAttribute('data-license-toggle') === 'yes' ||
      (target.textContent?.trim() === 'Yes' && Boolean(target.closest('[data-license-selector]')));

    if (isLicenseYes) {
      e.preventDefault();
      (target as HTMLButtonElement).click();
      const licenseContainer = target.closest('[data-license-selector]');
      if (licenseContainer) {
        const focusables = getFocusableElements(e.currentTarget);
        const targetIdx = focusables.indexOf(target as HTMLElement);
        const afterLicense = focusables.slice(targetIdx + 1).find(
          (el) => !licenseContainer.contains(el)
        );
        if (afterLicense) {
          afterLicense.focus();
          return;
        }
      }
      focusNextFormField(target, e.currentTarget);
      return;
    }

    // If it's part of a toggle group (e.g. Call/Chat, Yes/No, sub-menu options), activate it and advance
    if (parent && parent.querySelectorAll('button').length > 1) {
      e.preventDefault();
      (target as HTMLButtonElement).click();
      focusNextFormField(target, e.currentTarget);
      return;
    }

    // If it's a custom dropdown trigger (aria-haspopup="listbox"):
    // Let the dropdown component handle Enter (to toggle/open or select).
    // Do not advance focus to the next form field.
    if (target.getAttribute('aria-haspopup') === 'listbox') {
      return;
    }

    // Single buttons (like Clear Fields or custom triggers): let default button click occur
    return;
  }

  // 8. All form input and select fields:
  // Stop default form submission and focus the next field or button!
  e.preventDefault();
  focusNextFormField(target, e.currentTarget);
}
