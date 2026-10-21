/**
 * ==============================================================================
 * Foto Master Support Hub - Master Shift Summary Google Apps Script (v2.1)
 * ==============================================================================
 * Legacy reference only. Google Sheets is disabled for the support hub pilot.
 *
 * Features:
 * - Automatic Monthly Tabs: Formatted like "AUG 2026", "SEP 2026".
 * - Branded Dark Slate Header (#1E293B, White text, 12pt bold, 42px height).
 * - Precise Column Widths & Auto-Wrap across all cells.
 * - Dynamic Date & PHT Time Sorting (oldest to newest per monthly tab).
 * - Full CRUD Support (Insert, Update, Delete with Sheet-to-Sheet transfers on date change).
 * - Unified Domain Licensing Support ('active_247', 'link_sent', 'cloud_without').
 *
 * Security: A future deployment must use a server-held 32-byte hexadecimal token.
 * Missing, placeholder, and invalid tokens are rejected before touching any sheet.
 * ==============================================================================
 */

// ==============================================================================
// This placeholder makes the checked-in reference fail closed. Do not put a
// private token in browser code or commit a deployed credential here.
// ==============================================================================
const SECRET_TOKEN = 'REPLACE_WITH_YOUR_SECRET_TOKEN';
const PLACEHOLDER_SECRET_TOKENS = [
  'replace_with_your_secret_token',
  'your-random-32-byte-hex-token',
  'changeme',
  'placeholder'
];

function normalizeSecretToken(token) {
  return String(token || '').trim().replace(/^['"]|['"]$/g, '');
}

function hasUsableSecretToken(token) {
  const normalized = normalizeSecretToken(token);
  return Boolean(
    normalized &&
    !PLACEHOLDER_SECRET_TOKENS.includes(normalized.toLowerCase()) &&
    /^[a-f0-9]{64}$/i.test(normalized)
  );
}

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
  if (item.license) {
    if (item.license === 'active_247') return 'Yes';
    if (item.license === 'link_sent') return 'Link Sent';
    if (item.license === 'cloud_without') return 'Cloud Without';
  }
  if (item.valid247License === true) return 'Yes';
  if (item.inactiveSupportOption) return item.inactiveSupportOption;
  return item.valid247License === false ? 'Cloud Without' : 'Yes';
}

/**
 * Finds or initializes a styled monthly sheet tab.
 */
function getOrCreateMonthSheet(ss, tabName) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName, 0);
    ss.setActiveSheet(sheet);

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

/**
 * POST handler retained for reference. Sheets is disabled during the pilot.
 * The checked-in placeholder is intentionally rejected before lock or sheet access.
 */
function doPost(e) {
  const incomingToken = normalizeSecretToken(e && e.parameter && e.parameter.token);
  const configuredToken = normalizeSecretToken(SECRET_TOKEN);
  if (!hasUsableSecretToken(configuredToken) || incomingToken !== configuredToken) {
    return responseJSON({ success: false, error: 'Unauthorized.' });
  }

  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const item = data.payload;

    // --- 1. INSERT ---
    if (action === 'insert') {
      const tabName = getTabNameFromDate(item.date);
      const sheet = getOrCreateMonthSheet(ss, tabName);
      sheet.appendRow(formatInteractionRow(item));

      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 1, 1, HEADERS.length).setVerticalAlignment("middle");
      sortSheetByDate(sheet, true);

      return responseJSON({ success: true, message: `Inserted and sorted ${tabName}` });
    }

    // --- 2. UPDATE ---
    if (action === 'update') {
      const targetTabName = getTabNameFromDate(item.date);
      const sheets = ss.getSheets();
      let found = false;

      for (const sheet of sheets) {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] === item.id) {
            if (sheet.getName() === targetTabName) {
              // Same month -- update in place
              const range = sheet.getRange(i + 1, 1, 1, HEADERS.length);
              range.setValues([formatInteractionRow(item)]);
              range.setVerticalAlignment("middle");
              sortSheetByDate(sheet, true);
            } else {
              // Date changed to a different month -- move the row
              sheet.deleteRow(i + 1);
              const newSheet = getOrCreateMonthSheet(ss, targetTabName);
              newSheet.appendRow(formatInteractionRow(item));
              newSheet.getRange(newSheet.getLastRow(), 1, 1, HEADERS.length).setVerticalAlignment("middle");
              sortSheetByDate(newSheet, true);
            }
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        // ID not found anywhere -- insert as new row
        const sheet = getOrCreateMonthSheet(ss, targetTabName);
        sheet.appendRow(formatInteractionRow(item));
        sheet.getRange(sheet.getLastRow(), 1, 1, HEADERS.length).setVerticalAlignment("middle");
        sortSheetByDate(sheet, true);
      }
      return responseJSON({ success: true, message: 'Updated and sorted' });
    }

    // --- 3. DELETE ---
    if (action === 'delete') {
      const sheets = ss.getSheets();
      for (const sheet of sheets) {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] === item.id) {
            sheet.deleteRow(i + 1);
            return responseJSON({ success: true, message: `Deleted from ${sheet.getName()}` });
          }
        }
      }
      return responseJSON({ success: false, message: 'ID not found for delete' });
    }

    return responseJSON({ success: false, message: 'Unknown action' });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
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
