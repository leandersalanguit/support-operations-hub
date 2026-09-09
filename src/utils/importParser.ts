/**
 * @file importParser.ts
 * @description Utility for parsing and validating single-row Excel clipboard data
 * and formatting international phone numbers according to support hub standards.
 */

import {
  ChannelType,
  StatusType,
  CLIENT_PRODUCTS,
  CASE_CLASSIFICATIONS,
  STATUS_OPTIONS,
} from '../types';
import { SupportLicense } from '../domain/interaction/license';
import { getDayOfWeekFromDate } from './date';

/**
 * Result structure returned when parsing an Excel row.
 */
export interface ParsedExcelRow {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  agent: string;
  clientName: string;
  channel: ChannelType;
  phoneDetail: string;
  chatTicketDetail: string;
  clientProduct: string;
  caseClassification: string;
  additionalNotes: string;
  status: StatusType;
  license: SupportLicense;
  inEvent: boolean;
  firstTimeUser: boolean;
}

export {
  formatPhoneNumber,
  validatePhoneNumber,
  sanitizePhoneInput,
} from '../domain/client/phone';
import { formatPhoneNumber } from '../domain/client/phone';


/**
 * Parses a single tab-separated line copied from an Excel spreadsheet.
 * Verifies exactly 13 columns, converts date to YYYY-MM-DD, formats phone numbers,
 * unpacks license and boolean fields, and validates case classifications.
 *
 * @param {string} text - The raw clipboard string.
 * @param {string[]} [availableProducts] - Optional list of allowed products.
 * @param {string[]} [availableClassifications] - Optional list of allowed classifications.
 * @returns {{ data: ParsedExcelRow | null; error: string | null }}
 */
export function parseExcelRow(
  text: string,
  availableProducts?: string[],
  availableClassifications?: string[]
): { data: ParsedExcelRow | null; error: string | null } {
  if (!text || !text.trim()) {
    return {
      data: null,
      error: 'Clipboard is empty. Please copy a row from Excel first.',
    };
  }

  // Get the first non-empty line in case there are trailing newlines
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return {
      data: null,
      error: 'No valid data row found in clipboard.',
    };
  }

  const rowText = lines[0];
  const cols = rowText.split('\t').map((c) => c.trim());

  if (cols.length !== 13) {
    return {
      data: null,
      error: `Expected exactly 13 columns from Excel, but found ${cols.length}. Please make sure to copy an entire interaction row.`,
    };
  }

  // 1. Date: Parse MM.DD.YYYY or YYYY-MM-DD
  let dateFormatted = '';
  const rawDate = cols[0];
  if (rawDate.includes('.')) {
    const parts = rawDate.split('.');
    if (parts.length === 3) {
      const [m, d, y] = parts;
      dateFormatted = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  } else if (rawDate.includes('/')) {
    const parts = rawDate.split('/');
    if (parts.length === 3) {
      const [m, d, y] = parts;
      dateFormatted = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  } else if (rawDate.includes('-')) {
    dateFormatted = rawDate;
  }

  if (!dateFormatted || isNaN(new Date(dateFormatted).getTime())) {
    return {
      data: null,
      error: `Invalid date format: "${rawDate}". Expected MM.DD.YYYY (e.g. 09.06.2026).`,
    };
  }

  // 2. Day of Week
  const dayOfWeek = cols[1] || getDayOfWeekFromDate(dateFormatted);

  // 3. Agent
  const agent = cols[2];

  // 4. Client Name
  const clientName = cols[3];
  if (!clientName) {
    return {
      data: null,
      error: 'Client Name (Column 4) cannot be empty.',
    };
  }

  // 5. Channel (Call vs Chat)
  const rawChannel = cols[4].toLowerCase();
  const channel: ChannelType = rawChannel.includes('chat') ? 'Chat' : 'Call';

  // 5. Channel Details (Phone Number or Ticket Details)
  let phoneDetail = '';
  let chatTicketDetail = '';
  const rawDetails = cols[5];

  if (channel === 'Call') {
    phoneDetail = formatPhoneNumber(rawDetails);
  } else {
    chatTicketDetail = rawDetails.replace(/^['"]+/, '').trim();
  }

  const productList = availableProducts && availableProducts.length > 0 ? availableProducts : CLIENT_PRODUCTS;
  const classificationList =
    availableClassifications && availableClassifications.length > 0 ? availableClassifications : CASE_CLASSIFICATIONS;

  // 6. Product
  const rawProduct = cols[6];
  const matchedProduct =
    productList.find((p) => p.toLowerCase() === rawProduct.toLowerCase()) ||
    rawProduct ||
    productList[0] ||
    '';

  // 7. Case Classification
  const rawClassification = cols[7];
  const matchedClassification =
    classificationList.find((c) => c.toLowerCase() === rawClassification.toLowerCase()) ||
    rawClassification ||
    classificationList[0] ||
    '';

  // 8. Additional Notes
  const additionalNotes = cols[8].replace(/^['"]+/, '').trim();

  // 9. Status
  const rawStatus = cols[9];
  const matchedStatus =
    STATUS_OPTIONS.find((s) => s.label.toLowerCase() === rawStatus.toLowerCase())?.label ||
    'Solved';

  // 10. Support License / Support Eligibility
  const rawLicense = cols[10].toLowerCase();
  let license: SupportLicense = 'support_active';

  if (rawLicense.includes('renewal') || rawLicense.includes('link')) {
    license = 'renewal_sent';
  } else if (rawLicense.includes('inactive') || rawLicense.includes('without') || rawLicense === 'no') {
    license = 'support_inactive';
  }

  // 11. In Event
  const rawEvent = cols[11].toLowerCase();
  const inEvent = rawEvent === 'yes' || rawEvent === 'true';

  // 12. First Time User
  const rawFirstTime = cols[12].toLowerCase();
  const firstTimeUser = rawFirstTime === 'yes' || rawFirstTime === 'true';

  return {
    data: {
      date: dateFormatted,
      dayOfWeek,
      agent,
      clientName,
      channel,
      phoneDetail,
      chatTicketDetail,
      clientProduct: matchedProduct,
      caseClassification: matchedClassification,
      additionalNotes,
      status: matchedStatus,
      license,
      inEvent,
      firstTimeUser,
    },
    error: null,
  };
}
