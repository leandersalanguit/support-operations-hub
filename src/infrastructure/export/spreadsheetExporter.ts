/**
 * @file spreadsheetExporter.ts
 * @description Export utilities for generating CSV, Excel (.xlsx), and 13-column TSV clipboard rows,
 * complete with OWASP formula injection defenses.
 */

import { SupportInteraction } from '../../domain/interaction/types';
import { toSpreadsheetLabel } from '../../domain/interaction/license';
import { getAgentFirstName, formatAgentDisplayName } from '../../domain/identity/policies';
import { getHelpdeskName } from '../../utils/helpdesk';

/**
 * Sanitizes a spreadsheet cell to defend against CSV / Spreadsheet formula injection (OWASP CWE-1236).
 * Cells starting with =, +, -, @, \t, \r, or % are prefixed with a single quote.
 */
export function sanitizeSpreadsheetCell(value: string | undefined | null): string {
  if (!value) return '';
  const str = String(value);
  if (/^\s*[=+\-@\t\r%]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Derives a flat row representation for export.
 */
export function formatInteractionRow(item: SupportInteraction): Record<string, string> {
  const timeStr = item.time || (item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour12: false }) : '');

  let channelDetails = item.channelDetails || '';
  if (item.channel?.toLowerCase() === 'chat') {
    channelDetails = getHelpdeskName();
  }
  if (channelDetails.trim().startsWith('+')) {
    channelDetails = `'${channelDetails.trim()}`;
  }

  let formattedDate = item.date;
  if (formattedDate && formattedDate.includes('-')) {
    const parts = formattedDate.split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
  }

  const licenseLabel = toSpreadsheetLabel(item.license || 'support_active');

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
export function formatInteractionForExcelClipboard(item: SupportInteraction): string {
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
  const notes = (item.additionalNotes || '').replace(/[\r\n\t]+/g, ' ').trim();
  const status = item.status || '';
  const licenseValid = toSpreadsheetLabel(item.license || 'support_active');
  const eventCall = item.inEvent ? 'Yes' : 'No';
  const firstTime = item.firstTimeUser ? 'Yes' : 'No';

  return [
    sanitizeSpreadsheetCell(formattedDate),
    sanitizeSpreadsheetCell(day),
    sanitizeSpreadsheetCell(agent),
    sanitizeSpreadsheetCell(client),
    sanitizeSpreadsheetCell(channel),
    sanitizeSpreadsheetCell(details),
    sanitizeSpreadsheetCell(product),
    sanitizeSpreadsheetCell(classification),
    sanitizeSpreadsheetCell(notes),
    sanitizeSpreadsheetCell(status),
    sanitizeSpreadsheetCell(licenseValid),
    sanitizeSpreadsheetCell(eventCall),
    sanitizeSpreadsheetCell(firstTime),
  ].join('\t');
}

export function exportToCSV(interactions: SupportInteraction[], filename = 'shift_interactions.csv') {
  const rows = interactions.map(formatInteractionRow);

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

export async function exportToExcel(interactions: SupportInteraction[], filename = 'shift_interactions.xlsx') {
  const rows = interactions.map(formatInteractionRow);

  if (rows.length === 0) {
    alert('No interactions to export.');
    return;
  }

  const writeXlsxFile = (await import('write-excel-file/browser')).default;

  const schema = [
    { column: 'Date & Day', type: String, value: (row: Record<string, string>) => row['Date & Day'] || '', width: 22 },
    { column: 'Time', type: String, value: (row: Record<string, string>) => row['Time'] || '', width: 14 },
    { column: 'Agent', type: String, value: (row: Record<string, string>) => row['Agent'] || '', width: 18 },
    { column: 'Client Name', type: String, value: (row: Record<string, string>) => row['Client Name'] || '', width: 25 },
    { column: 'Channel', type: String, value: (row: Record<string, string>) => row['Channel'] || '', width: 14 },
    { column: 'Channel Details', type: String, value: (row: Record<string, string>) => row['Channel Details'] || '', width: 22 },
    { column: 'Client Product', type: String, value: (row: Record<string, string>) => row['Client Product'] || '', width: 18 },
    { column: 'Case Classification', type: String, value: (row: Record<string, string>) => row['Case Classification'] || '', width: 24 },
    { column: 'Status', type: String, value: (row: Record<string, string>) => row['Status'] || '', width: 20 },
    { column: 'Support License Eligibility', type: String, value: (row: Record<string, string>) => row['Support License Eligibility'] || '', width: 28 },
    { column: 'In Event', type: String, value: (row: Record<string, string>) => row['In Event'] || '', width: 12 },
    { column: 'First Time Using Product', type: String, value: (row: Record<string, string>) => row['First Time Using Product'] || '', width: 26 },
    { column: 'Additional Notes', type: String, value: (row: Record<string, string>) => row['Additional Notes'] || '', width: 45 },
  ];

  await (writeXlsxFile as any)(rows, {
    schema,
    fileName: filename,
    headerStyle: {
      backgroundColor: '#1E293B',
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
  });
}
