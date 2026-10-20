/**
 * @file spreadsheetExporter.ts
 * @description Export utilities for generating CSV, Excel (.xlsx), and 13-column TSV clipboard rows,
 * complete with OWASP formula injection defenses.
 */

import { SupportInteraction } from '../../domain/interaction/types';
import { toSpreadsheetLabel } from '../../domain/interaction/license';
import { SupportTier } from '../supabase/configRepo';
import { getAgentFirstName, formatAgentDisplayName } from '../../domain/identity/policies';
import { getHelpdeskName } from '../../utils/helpdesk';
import type { Column } from 'write-excel-file/browser';

/**
 * Makes formula-looking text literal in spreadsheet programs (OWASP CWE-1236).
 * Check for formula prefixes after whitespace and control characters.
 */
export function sanitizeSpreadsheetCell(value: string | undefined | null): string {
  if (!value) return '';
  const str = String(value);
  if (/^[\s\u0000-\u001f\u007f]*[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Formats an Interaction record into a key-value record matching the spreadsheet column schema.
 */
export function formatInteractionRow(
  item: SupportInteraction,
  supportTiers?: SupportTier[]
): Record<string, string> {
  const timeStr = item.time ? item.time.slice(0, 5) : '00:00';
  let channelDetails = item.channelDetails || '';
  if (item.channel?.toLowerCase() === 'chat') {
    channelDetails = getHelpdeskName();
  }

  // Format date to MM/DD/YYYY
  let formattedDate = item.date;
  if (formattedDate && formattedDate.includes('-')) {
    const parts = formattedDate.split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
  }

  const licenseLabel = toSpreadsheetLabel(item.license || 'support_active', supportTiers);

  return {
    'Date & Day': `${formattedDate} (${item.dayOfWeek})`,
    'Time': timeStr,
    'Agent': formatAgentDisplayName(item.agent) || item.agent,
    'Client Name': item.clientName,
    'Channel': item.channel,
    'Channel Details': channelDetails,
    'Client Product': item.clientProduct,
    'Case Classification': item.caseClassification,
    'Status': item.status,
    'Support License Eligibility': licenseLabel,
    'In Event': item.inEvent ? 'Yes' : 'No',
    'First Time Using Product': item.firstTimeUser ? 'Yes' : 'No',
    'Additional Notes': item.additionalNotes,
  };
}

export function formatDateForClipboard(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${month.padStart(2, '0')}.${day.padStart(2, '0')}.${year}`;
  }
  return dateString;
}

/**
 * Formats an Interaction record into a tab-delimited string formatted for Excel pasting.
 * Columns: Date, Day, Agent, Client, Channel, Details, Product, Case, Notes, Status, License Valid, Event Call?, First time?
 */
export function formatInteractionForExcelClipboard(
  item: SupportInteraction,
  supportTiers?: SupportTier[]
): string {
  const formattedDate = formatDateForClipboard(item.date);
  const day = item.dayOfWeek || '';
  const agent = getAgentFirstName(item.agent);
  const client = item.clientName || '';
  const channel = item.channel || '';
  let details = item.channelDetails || '';
  if (channel.toLowerCase() === 'chat') {
    details = getHelpdeskName();
  }
  const product = item.clientProduct || '';
  const classification = item.caseClassification || '';
  const notes = item.additionalNotes || '';
  const status = item.status || '';
  const licenseValid = toSpreadsheetLabel(item.license || 'support_active', supportTiers);
  const eventCall = item.inEvent ? 'Yes' : 'No';
  const firstTime = item.firstTimeUser ? 'Yes' : 'No';

  return [
    formattedDate,
    day,
    agent,
    client,
    channel,
    details,
    product,
    classification,
    notes,
    status,
    licenseValid,
    eventCall,
    firstTime,
  ].map((value) => {
    const literal = sanitizeSpreadsheetCell(value);
    // Excel's quoted TSV cells preserve embedded delimiters and multiline notes.
    return /[\t\r\n"]/.test(literal) ? `"${literal.replace(/"/g, '""')}"` : literal;
  }).join('\t');
}

export function exportToCSV(
  interactions: SupportInteraction[],
  filename = 'shift_interactions.csv',
  supportTiers?: SupportTier[]
) {
  const rows = interactions.map((item) => formatInteractionRow(item, supportTiers));

  if (rows.length === 0) {
    alert('No interactions to export.');
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = row[header] ?? '';
          const sanitized = sanitizeSpreadsheetCell(String(val));
          const escaped = sanitized.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToExcel(
  interactions: SupportInteraction[],
  filename = 'shift_interactions.xlsx',
  supportTiers?: SupportTier[]
) {
  const rows = interactions.map((item) => formatInteractionRow(item, supportTiers));

  if (rows.length === 0) {
    alert('No interactions to export.');
    return;
  }

  const writeXlsxFile = (await import('write-excel-file/browser')).default;

  const fields = [
    ["Date & Day", 22], ["Time", 14], ["Agent", 18], ["Client Name", 25],
    ["Channel", 14], ["Channel Details", 22], ["Client Product", 18],
    ["Case Classification", 24], ["Status", 20], ["Support License Eligibility", 28],
    ["In Event", 12], ["First Time Using Product", 26], ["Additional Notes", 45],
  ] as const;
  const columns: Column<Record<string, string>>[] = fields.map(([key, width]) => ({
    header: { type: String, value: key, backgroundColor: "#1E293B", color: "#FFFFFF", fontWeight: "bold" },
    cell: (row) => ({ type: String, value: row[key] ?? "" }),
    width,
  }));
  await writeXlsxFile(rows, { columns }).toFile(filename);
}
