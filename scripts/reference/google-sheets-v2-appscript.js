/**
 * ==============================================================================
 * Foto Master Support Hub - Master Shift Summary Google Apps Script (v2.1)
 * ==============================================================================
 * Reference endpoint for versioned master-sheet synchronization. Review the
 * deployment configuration before enabling an Apps Script web app.
 *
 * Features:
 * - Automatic Monthly Tabs: Formatted like "AUG 2026", "SEP 2026".
 * - Branded Dark Slate Header (#1E293B, White text, 12pt bold, 42px height).
 * - Precise Column Widths & Auto-Wrap across all cells.
 * - Dynamic Date & PHT Time Sorting (oldest to newest per monthly tab).
 * - Full CRUD Support (Insert, Update, Delete with Sheet-to-Sheet transfers on date change).
 * - Unified Domain Licensing Support ('active_247', 'link_sent', 'cloud_without').
 *
 * Security: Set SECRET_TOKEN in Apps Script Script Properties to a randomly
 * generated 32-byte hexadecimal token before deployment. Set
 * MASTER_SPREADSHEET_ID to the workbook ID; this web app opens only that file.
 * ==============================================================================
 */

// ==============================================================================
// The deployed secret is read from Script Properties at request time.
// ==============================================================================
const SYNC_STATE_TAB = '_SYNC_STATE';
const MAX_REQUEST_CHARS = 65536;
const ROOT_FIELDS = ['token', 'action', 'version', 'payload'];
const PAYLOAD_FIELDS = [
  'id', 'createdAt', 'date', 'dayOfWeek', 'time', 'agent', 'clientName',
  'channel', 'channelDetails', 'clientProduct', 'caseClassification',
  'status', 'license', 'inEvent', 'firstTimeUser', 'additionalNotes'
];

/** Makes untrusted strings literal when written into a spreadsheet cell. */
function sanitizeSpreadsheetCell(value) {
  const text = value == null ? '' : String(value);
  return /^[\s\u0000-\u001f\u007f]*[=+\-@]/.test(text) ? "'" + text : text;
}

const HEADERS = [
  "ID",                   // Column A (Hidden UUID)
  "Date",                 // Column B (MM/DD/YYYY)
  "Day of Week",          // Column C (e.g. Wednesday)
  "Time Logged",          // Column D (HH:mm PHT)
  "Agent",                // Column E (Agent Name)
  "Client Name",          // Column F (Client / Company Name)
  "Channel",              // Column G (Call | Chat)
  "Channel Details",      // Column H (Phone Number / Ticket Link)
  "Product",              // Column I (Product / Hardware)
  "Classification",       // Column J (Case Classification)
  "Status",               // Column K (Resolution Status)
  "Support License",      // Column L (Yes | Renewal Sent | Support Inactive)
  "In Event",             // Column M (Yes | No)
  "First Time User",      // Column N (Yes | No)
  "Notes"                 // Column O (Additional Notes / Context)
];

const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

/**
 * Derives the monthly tab name from an ISO or YYYY-MM-DD date string (e.g. "SEP 2026").
 */
function getTabNameFromDate(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  }
  let year = new Date().getFullYear();
  let monthIndex = 0;

  if (dateStr.includes('-')) {
    const parts = dateStr.split("-");
    year = parts[0];
    monthIndex = parseInt(parts[1], 10) - 1;
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split("/");
    monthIndex = parseInt(parts[0], 10) - 1;
    year = parts[2];
  }

  const monthName = MONTH_NAMES[monthIndex] || "LOGS";
  return `${monthName} ${year}`;
}

/**
 * Formats YYYY-MM-DD to MM/DD/YYYY.
 */
function formatDateToMMDDYYYY(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
  }
  return dateStr;
}

/**
 * Formats timestamp to Philippine Time (PHT, Asia/Manila) in HH:mm.
 */
function formatTimeLoggedPHT(timeStr, isoString) {
  if (timeStr && /^\d{2}:\d{2}/.test(timeStr)) {
    return timeStr.slice(0, 5);
  }
  const d = isoString ? new Date(isoString) : new Date();
  return Utilities.formatDate(d, "Asia/Manila", "HH:mm");
}

/**
 * Unifies licensing representation into clean spreadsheet text.
 */
function formatLicenseDisplay(item) {
  const labels = {
    support_active: 'Yes',
    renewal_sent: 'Renewal Sent',
    support_inactive: 'Support Inactive',
    active_247: 'Yes',
    link_sent: 'Link Sent',
    cloud_without: 'Cloud Without'
  };
  return Object.prototype.hasOwnProperty.call(labels, item.license)
    ? labels[item.license]
    : (item.license || 'Yes');
}

/**
 * Finds or initializes a styled monthly sheet tab.
 */
function getOrCreateMonthSheet(ss, tabName) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName, 0);
    // Apply baseline styling
    sheet.getRange(1, 1, 1000, HEADERS.length)
      .setFontFamily("Arial")
      .setFontSize(12)
      .setVerticalAlignment("middle")
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

    // Header styling
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground("#1E293B");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(12);
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.setRowHeight(1, 42);

    // Freeze header row
    sheet.setFrozenRows(1);

    // Column widths
    sheet.setColumnWidth(1, 50);   // ID (Hidden)
    sheet.setColumnWidth(2, 125);  // Date (MM/DD/YYYY)
    sheet.setColumnWidth(3, 110);  // Day of Week
    sheet.setColumnWidth(4, 70);   // Time Logged
    sheet.setColumnWidth(5, 140);  // Agent
    sheet.setColumnWidth(6, 180);  // Client Name
    sheet.setColumnWidth(7, 95);   // Channel
    sheet.setColumnWidth(8, 160);  // Channel Details
    sheet.setColumnWidth(9, 130);  // Product
    sheet.setColumnWidth(10, 150); // Classification
    sheet.setColumnWidth(11, 140); // Status
    sheet.setColumnWidth(12, 110); // Support License
    sheet.setColumnWidth(13, 85);  // In Event
    sheet.setColumnWidth(14, 60);  // First Time User
    sheet.setColumnWidth(15, 360); // Notes

    // Column alignments
    sheet.getRange("B:D").setHorizontalAlignment("center");
    sheet.getRange("G:G").setHorizontalAlignment("center");
    sheet.getRange("K:N").setHorizontalAlignment("center");

    // Multiline wrapping
    sheet.getRange("A:O").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

    // Hide Column A (UUID ID)
    sheet.hideColumns(1);
  }
  return sheet;
}

/**
 * Transforms an interaction object into an array for sheet rows.
 */
function formatInteractionRow(item) {
  const details = item.channelDetails || '';

  const licenseVal = formatLicenseDisplay(item);
  const inEventVal = item.inEvent ? 'Yes' : 'No';
  const firstTimeVal = item.firstTimeUser ? 'Yes' : 'No';
  const timeLoggedPHT = formatTimeLoggedPHT(item.time, item.createdAt);

  return [
    item.id,
    formatDateToMMDDYYYY(item.date),
    item.dayOfWeek || '',
    timeLoggedPHT,
    item.agent || '',
    item.clientName || '',
    item.channel || 'Call',
    details,
    item.clientProduct || '',
    item.caseClassification || '',
    item.status || 'Solved',
    licenseVal,
    inEventVal,
    firstTimeVal,
    item.additionalNotes || ''
  ].map(sanitizeSpreadsheetCell);
}

/**
 * Sorts data rows by Date (Col B) and Time Logged (Col D).
 */
function sortSheetByDate(sheet, ascending = true) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;

  const dataRange = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
  dataRange.sort([
    { column: 2, ascending: ascending },
    { column: 4, ascending: ascending }
  ]);
}

function doPost(e) {
  let data;
  try {
    const contents = e && e.postData && e.postData.contents;
    if (typeof contents !== 'string' || contents.length > MAX_REQUEST_CHARS) {
      return responseJSON({ ok: false, error: 'invalid_request' });
    }
    data = JSON.parse(contents);
  } catch (_err) {
    return responseJSON({ ok: false, error: 'invalid_request' });
  }

  let configuredToken;
  let spreadsheetId;
  try {
    const properties = PropertiesService.getScriptProperties();
    configuredToken = properties.getProperty('SECRET_TOKEN');
    spreadsheetId = properties.getProperty('MASTER_SPREADSHEET_ID');
  } catch (_err) {
    return responseJSON({ ok: false, error: 'unauthorized' });
  }
  if (!hasUsableSecretToken(configuredToken) || !data || typeof data.token !== 'string' || data.token !== configuredToken) {
    return responseJSON({ ok: false, error: 'unauthorized' });
  }
  if (!isValidSpreadsheetId(spreadsheetId)) return responseJSON({ ok: false, error: 'server_error' });

  const request = validateRequestObject(data);
  if (!request) return responseJSON({ ok: false, error: 'invalid_request' });

  let lock;
  let acquired = false;
  try {
    lock = LockService.getScriptLock();
    acquired = lock.tryLock(10000);
  } catch (_err) {
    return responseJSON({ ok: false, error: 'lock_unavailable' });
  }
  if (!acquired) return responseJSON({ ok: false, error: 'lock_unavailable' });

  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    if (!ss) return responseJSON({ ok: false, error: 'server_error' });
    const item = request.payload;
    const stateSheet = getOrCreateSyncStateSheet(ss);
    const state = getSyncState(stateSheet, item.id);
    if (state && request.version <= state.version) return responseJSON(successAck(request, true));

    const matches = findMonthlyRows(ss, item.id);
    if (request.action === 'delete') {
      deleteMonthlyMatches(matches);
      SpreadsheetApp.flush();
      saveSyncState(stateSheet, item.id, request.version, true);
      SpreadsheetApp.flush();
    } else {
      const targetSheet = getOrCreateMonthSheet(ss, getTabNameFromDate(item.date));
      const targetMatch = matches.find((match) => match.sheet === targetSheet);
      const row = formatInteractionRow(item);
      let targetRow;
      if (targetMatch) {
        targetRow = targetMatch.rowIndex;
        targetSheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([row]).setVerticalAlignment('middle');
      } else {
        targetSheet.appendRow(row);
        targetRow = targetSheet.getLastRow();
        targetSheet.getRange(targetRow, 1, 1, HEADERS.length).setVerticalAlignment('middle');
      }
      deleteMonthlyMatches(matches.filter((match) => match.sheet !== targetSheet || match.rowIndex !== targetRow));
      sortSheetByDate(targetSheet, true);
      SpreadsheetApp.flush();
      saveSyncState(stateSheet, item.id, request.version, false);
      SpreadsheetApp.flush();
    }
    return responseJSON(successAck(request, false));
  } catch (_err) {
    // Do not expose spreadsheet, request, token, or PII details to callers/logs.
    return responseJSON({ ok: false, error: 'server_error' });
  } finally {
    if (acquired) {
      try { lock.releaseLock(); } catch (_err) { /* Keep the response generic. */ }
    }
  }
}

function validateRequestObject(data) {
  if (!isPlainObject(data) || !hasExactFields(data, ROOT_FIELDS)) return null;
  if (data.action !== 'insert' && data.action !== 'update' && data.action !== 'delete') return null;
  if (!Number.isSafeInteger(data.version) || data.version < 1) return null;

  const item = data.payload;
  if (!isPlainObject(item) || !hasExactFields(item, PAYLOAD_FIELDS)) return null;
  if (typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(item.id)) return null;
  if (typeof item.createdAt !== 'string' || item.createdAt.length > 40 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(item.createdAt) || !isValidDateTime(item.createdAt)) return null;
  if (!isValidCalendarDate(item.date)) return null;
  if (typeof item.inEvent !== 'boolean' || typeof item.firstTimeUser !== 'boolean') return null;

  const limits = {
    dayOfWeek: 20, time: 16, agent: 160, clientName: 240, channel: 40,
    channelDetails: 1000, clientProduct: 160, caseClassification: 160,
    status: 80, license: 80, additionalNotes: 10000
  };
  for (const field in limits) {
    if (typeof item[field] !== 'string' || item[field].length > limits[field]) return null;
  }
  if (!isValidTime(item.time)) return null;
  return { action: data.action, version: data.version, payload: item };
}

function isValidTime(value) {
  if (!/^\d{2}:\d{2}(?::\d{2})?$/.test(value)) return false;
  const parts = value.split(':').map(Number);
  return parts[0] <= 23 && parts[1] <= 59 && (parts.length === 2 || parts[2] <= 59);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]';
}

function hasExactFields(value, fields) {
  const actual = Object.keys(value).sort();
  const expected = fields.slice().sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split('-').map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return date.getUTCFullYear() === parts[0] && date.getUTCMonth() === parts[1] - 1 && date.getUTCDate() === parts[2];
}

function isValidDateTime(value) {
  return isValidCalendarDate(value.slice(0, 10)) && !isNaN(new Date(value).getTime());
}

function hasUsableSecretToken(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

function isValidSpreadsheetId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,128}$/.test(value);
}

function successAck(request, ignored) {
  return { ok: true, id: request.payload.id, version: request.version, action: request.action, ignored: ignored };
}

function getOrCreateSyncStateSheet(ss) {
  let sheet = ss.getSheetByName(SYNC_STATE_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(SYNC_STATE_TAB);
    sheet.appendRow(['ID', 'VERSION', 'DELETED']);
    if (sheet.hideSheet) sheet.hideSheet();
  }
  return sheet;
}

function getSyncState(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  for (let index = 0; index < rows.length; index++) {
    if (rows[index][0] === id) return { version: Number(rows[index][1]), deleted: rows[index][2] === true };
  }
  return null;
}

function saveSyncState(sheet, id, version, deleted) {
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (let index = 0; index < rows.length; index++) {
      if (rows[index][0] === id) {
        sheet.getRange(index + 2, 1, 1, 3).setValues([[id, version, deleted]]);
        return;
      }
    }
  }
  sheet.appendRow([id, version, deleted]);
}

function findMonthlyRows(ss, id) {
  const found = [];
  ss.getSheets().forEach((sheet) => {
    if (!/^[A-Z]{3} \d{4}$/.test(sheet.getName())) return;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    rows.forEach((row, index) => {
      if (row[0] === id) found.push({ sheet: sheet, rowIndex: index + 2 });
    });
  });
  return found;
}

function deleteMonthlyMatches(matches) {
  const bySheet = new Map();
  matches.forEach((match) => {
    const key = match.sheet.getName();
    if (!bySheet.has(key)) bySheet.set(key, []);
    bySheet.get(key).push(match);
  });
  bySheet.forEach((sheetMatches) => {
    sheetMatches.sort((left, right) => right.rowIndex - left.rowIndex);
    sheetMatches.forEach((match) => match.sheet.deleteRow(match.rowIndex));
  });
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Utility: re-applies wrap strategy and vertical alignment to all existing sheets.
 * Run manually from the Apps Script editor if existing tabs need reformatting.
 */
function applyWrapToAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  sheets.forEach(sheet => {
    sheet.getRange("A:O").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.getDataRange().setVerticalAlignment("middle");
  });
}
