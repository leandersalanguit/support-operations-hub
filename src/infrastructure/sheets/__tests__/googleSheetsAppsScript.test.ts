import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const token = 'a'.repeat(64);
const scriptPath = path.resolve(process.cwd(), 'scripts/reference/google-sheets-v2-appscript.js');

class FakeSheet {
  rows: unknown[][] = [];
  hidden = false;

  constructor(
    private name: string,
    private events: string[] = [],
    private deletion: { count: number; failAfter: number | null } = { count: 0, failAfter: null },
  ) {}
  getName() { return this.name; }
  hideSheet() { this.hidden = true; return this; }
  getLastRow() { return this.rows.length; }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.rows.length), 15); }
  getRange(...args: unknown[]) {
    const sheet = this;
    const [row, column, rowCount = 1, columnCount = 1] = args;
    return {
      getValues() {
        if (row === 1 && column === 1 && rowCount === Math.max(1, sheet.rows.length) && columnCount === 15) {
          return sheet.rows.map((item) => [...item]);
        }
        return Array.from({ length: Number(rowCount) }, (_, rowOffset) =>
          Array.from({ length: Number(columnCount) }, (_, columnOffset) =>
            sheet.rows[Number(row) - 1 + rowOffset]?.[Number(column) - 1 + columnOffset] ?? ''
          )
        );
      },
      setValues(values: unknown[][]) {
        values.forEach((valuesRow, rowOffset) => {
          const targetRow = Number(row) - 1 + rowOffset;
          while (sheet.rows.length <= targetRow) sheet.rows.push([]);
          valuesRow.forEach((value, columnOffset) => {
            sheet.rows[targetRow][Number(column) - 1 + columnOffset] = value;
          });
        });
        sheet.events.push(`${sheet.name}:write`);
        return this;
      },
      clearContent() {
        const start = Number(row) - 1;
        const count = Number(rowCount);
        sheet.rows.splice(start, count);
        return this;
      },
      setFontFamily() { return this; },
      setFontSize() { return this; },
      setVerticalAlignment() { return this; },
      setWrapStrategy() { return this; },
      setBackground() { return this; },
      setFontColor() { return this; },
      setFontWeight() { return this; },
      setHorizontalAlignment() { return this; },
      setRowHeight() { return this; },
      setFrozenRows() { return this; },
      setColumnWidth() { return this; },
      hideColumns() { sheet.hidden = true; return this; },
      sort() { return this; },
    };
  }
  appendRow(row: unknown[]) { this.rows.push([...row]); this.events.push(`${this.name}:write`, `${this.name}:append:${row[0]}`); }
  deleteRow(index: number) {
    this.rows.splice(index - 1, 1);
    this.events.push(`${this.name}:delete`);
    this.deletion.count += 1;
    if (this.deletion.failAfter === this.deletion.count) {
      this.deletion.failAfter = null;
      throw new Error('simulated partial deletion');
    }
  }
  setRowHeight() {}
  setFrozenRows() {}
  setColumnWidth() {}
  hideColumns() { this.hidden = true; }
}

function createAppsScript(
  lockAvailable = true,
  configuredToken: string | null = token,
  config: { spreadsheetId?: string | null } = {},
) {
  const events: string[] = [];
  const deletion = { count: 0, failAfter: null as number | null };
  const sheets = [new FakeSheet('Sheet1', events, deletion)];
  const spreadsheet = {
    getSheets: () => sheets,
    getSheetByName: (name: string) => sheets.find((sheet) => sheet.getName() === name) || null,
    insertSheet: (name: string) => {
      const sheet = new FakeSheet(name, events, deletion);
      sheets.unshift(sheet);
      return sheet;
    },
    setActiveSheet: () => {},
  };
  let sheetAccesses = 0;
  let activeSpreadsheetAccesses = 0;
  let spreadsheetIdsOpened: string[] = [];
  let lockReleases = 0;
  let flushCount = 0;
  let failNextFlush = false;
  let failOnFlush: number | null = null;
  const spreadsheetId = config.spreadsheetId === undefined ? 'spreadsheet-id-12345678901234567890' : config.spreadsheetId;
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key: string) => key === 'SECRET_TOKEN' ? configuredToken : key === 'MASTER_SPREADSHEET_ID' ? spreadsheetId : null }) },
    LockService: { getScriptLock: () => ({ tryLock: () => lockAvailable, releaseLock: () => { lockReleases += 1; events.push('lock:release'); } }) },
    SpreadsheetApp: {
      WrapStrategy: { WRAP: 'WRAP' },
      getActiveSpreadsheet: () => { sheetAccesses += 1; activeSpreadsheetAccesses += 1; return spreadsheet; },
      openById: (id: string) => { sheetAccesses += 1; spreadsheetIdsOpened.push(id); return id === spreadsheetId ? spreadsheet : null; },
      flush: () => { flushCount += 1; events.push(`flush:${flushCount}`); if (failNextFlush || flushCount === failOnFlush) { failNextFlush = false; failOnFlush = null; throw new Error('simulated flush failure'); } },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (contents: string) => ({
        contents,
        setMimeType() { return this; },
      }),
    },
    Utilities: { formatDate: (_date: Date, _timezone: string, _format: string) => '09:30' },
    console: { log() {}, error() {} },
  });
  vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context);

  return {
    context,
    sheets,
    events,
    get sheetAccesses() { return sheetAccesses; },
    get activeSpreadsheetAccesses() { return activeSpreadsheetAccesses; },
    get spreadsheetIdsOpened() { return spreadsheetIdsOpened; },
    get lockReleases() { return lockReleases; },
    failNextFlush() { failNextFlush = true; },
    failOnFlushNumber(number: number) { failOnFlush = flushCount + number; },
    failAfterDeletes(count: number) { deletion.failAfter = deletion.count + count; },
    createSheet(name: string) { return new FakeSheet(name, events, deletion); },
    recordWrite(sheetName: string) { events.push(`${sheetName}:write`); },
    doPost(data: Record<string, unknown>) {
      const output = (context as any).doPost({ postData: { contents: JSON.stringify(data) } });
      return JSON.parse(output.contents);
    },
    doPostWithEvent(event: Record<string, unknown>, secret = token) {
      return this.doPost({ token: secret, ...event });
    },
  };
}

const payload = (overrides: Record<string, unknown> = {}) => ({
  id: 'interaction-1',
  createdAt: '2026-10-24T01:30:00.123456+00:00',
  date: '2026-10-24',
  dayOfWeek: 'Saturday',
  time: '09:30:00',
  agent: 'Agent A',
  clientName: 'Client A',
  channel: 'Call',
  channelDetails: 'Ticket 12',
  clientProduct: 'Widget',
  caseClassification: 'Other',
  status: 'Solved',
  license: 'support_active',
  inEvent: false,
  firstTimeUser: false,
  additionalNotes: 'Normal text',
  ...overrides,
});

describe('Google Apps Script master sheet endpoint', () => {
  it('rejects a wrong body token before opening the spreadsheet', () => {
    const script = createAppsScript();
    const result = script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() }, 'wrong');

    expect(result).toEqual({ ok: false, error: 'unauthorized' });
    expect(script.sheetAccesses).toBe(0);
  });

  it('does not accept an old query-string token', () => {
    const script = createAppsScript();
    const output = script.doPost({ parameter: { token }, postData: { contents: '{}' } });

    expect(output).toEqual({ ok: false, error: 'unauthorized' });
    expect(script.sheetAccesses).toBe(0);
  });

  it('fails closed when Script Properties does not contain a strong secret', () => {
    const script = createAppsScript(true, 'placeholder');
    const result = script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });

    expect(result).toEqual({ ok: false, error: 'unauthorized' });
    expect(script.sheetAccesses).toBe(0);
  });

  it('opens only the spreadsheet configured in Script Properties', () => {
    const script = createAppsScript();
    const result = script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });

    expect(result.ok).toBe(true);
    expect(script.spreadsheetIdsOpened).toEqual(['spreadsheet-id-12345678901234567890']);
    expect(script.activeSpreadsheetAccesses).toBe(0);
  });

  it('fails closed when the configured spreadsheet ID is missing', () => {
    const script = createAppsScript(true, token, { spreadsheetId: null });
    const result = script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });

    expect(result).toEqual({ ok: false, error: 'server_error' });
    expect(script.sheetAccesses).toBe(0);

    const malformed = createAppsScript(true, token, { spreadsheetId: 'not a valid spreadsheet ID' });
    expect(malformed.doPostWithEvent({ action: 'insert', version: 1, payload: payload() })).toEqual({ ok: false, error: 'server_error' });
    expect(malformed.sheetAccesses).toBe(0);
  });

  it('inserts an interaction into its monthly tab and ignores the same version twice', () => {
    const script = createAppsScript();
    const event = { action: 'insert', version: 1, payload: payload() };

    expect(script.doPostWithEvent(event)).toEqual({ ok: true, id: 'interaction-1', version: 1, action: 'insert', ignored: false });
    expect(script.doPostWithEvent(event)).toEqual({ ok: true, id: 'interaction-1', version: 1, action: 'insert', ignored: true });
    const month = script.sheets.find((sheet) => sheet.getName() === 'OCT 2026');
    expect(month?.rows).toHaveLength(2);
    expect(month?.rows[1][0]).toBe('interaction-1');
  });

  it('rejects an old update after a newer update', () => {
    const script = createAppsScript();
    script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });
    script.doPostWithEvent({ action: 'update', version: 3, payload: payload({ additionalNotes: 'new value' }) });
    const result = script.doPostWithEvent({ action: 'update', version: 2, payload: payload({ additionalNotes: 'old value' }) });
    const month = script.sheets.find((sheet) => sheet.getName() === 'OCT 2026');

    expect(result.ignored).toBe(true);
    expect(month?.rows[1][14]).toBe('new value');
  });

  it('moves the row between months and leaves a tombstone after delete', () => {
    const script = createAppsScript();
    script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });
    script.doPostWithEvent({ action: 'update', version: 2, payload: payload({ date: '2026-11-02' }) });
    expect(script.sheets.find((sheet) => sheet.getName() === 'OCT 2026')?.rows).toHaveLength(1);
    expect(script.sheets.find((sheet) => sheet.getName() === 'NOV 2026')?.rows).toHaveLength(2);

    script.doPostWithEvent({ action: 'delete', version: 3, payload: payload({ date: '2026-11-02' }) });
    const stale = script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });
    expect(stale.ignored).toBe(true);
    expect(script.sheets.find((sheet) => sheet.getName() === 'NOV 2026')?.rows).toHaveLength(1);
    const state = script.sheets.find((sheet) => sheet.getName() === '_SYNC_STATE');
    expect(state?.hidden).toBe(true);
    expect(state?.rows[1]).toEqual(['interaction-1', 3, true]);
  });

  it('writes formula-like fields as literal text', () => {
    const script = createAppsScript();
    script.doPostWithEvent({ action: 'insert', version: 1, payload: payload({
      clientName: ' =IMPORTXML("https://example.test", "//x")',
      channelDetails: '+1-555-0100',
      additionalNotes: '@SUM(A1:A2)',
    }) });
    const month = script.sheets.find((sheet) => sheet.getName() === 'OCT 2026');

    expect(month?.rows[1][5]).toBe("' =IMPORTXML(\"https://example.test\", \"//x\")");
    expect(month?.rows[1][7]).toBe("'+1-555-0100");
    expect(month?.rows[1][14]).toBe("'@SUM(A1:A2)");
  });

  it('maps canonical and custom license codes to their spreadsheet labels', () => {
    const script = createAppsScript();
    const licenses = ['support_active', 'renewal_sent', 'support_inactive', 'custom_tier'];
    licenses.forEach((license, index) => script.doPostWithEvent({ action: 'insert', version: 1, payload: payload({ id: `license-${index}`, license }) }));
    const month = script.sheets.find((sheet) => sheet.getName() === 'OCT 2026');

    expect(month?.rows.slice(1).map((row) => row[11])).toEqual(['Yes', 'Renewal Sent', 'Support Inactive', 'custom_tier']);
  });

  it('flushes row data before version state and state before success acknowledgement', () => {
    const script = createAppsScript();
    const result = script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });
    const rowWrite = script.events.indexOf('OCT 2026:write');
    const firstFlush = script.events.indexOf('flush:1');
    const stateWrite = script.events.indexOf('_SYNC_STATE:append:interaction-1');
    const secondFlush = script.events.indexOf('flush:2');
    const release = script.events.indexOf('lock:release');

    expect(result.ok).toBe(true);
    expect(rowWrite).toBeGreaterThanOrEqual(0);
    expect(rowWrite).toBeLessThan(firstFlush);
    expect(firstFlush).toBeLessThan(stateWrite);
    expect(stateWrite).toBeLessThan(secondFlush);
    expect(secondFlush).toBeLessThan(release);
  });

  it('returns a generic retryable failure when state flush fails after row flush', () => {
    const script = createAppsScript();
    script.failOnFlushNumber(2);
    const failed = script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });
    const retry = script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });
    const month = script.sheets.find((sheet) => sheet.getName() === 'OCT 2026');

    expect(failed).toEqual({ ok: false, error: 'server_error' });
    expect(retry.ok).toBe(true);
    expect(month?.rows.filter((row) => row[0] === 'interaction-1')).toHaveLength(1);
  });

  it('retries a partial month move without losing or duplicating the row', () => {
    const script = createAppsScript();
    script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });
    script.failNextFlush();
    const failed = script.doPostWithEvent({ action: 'update', version: 2, payload: payload({ date: '2026-11-02' }) });
    const retry = script.doPostWithEvent({ action: 'update', version: 2, payload: payload({ date: '2026-11-02' }) });
    const monthlyRows = script.sheets.flatMap((sheet) => /^[A-Z]{3} \d{4}$/.test(sheet.getName()) ? sheet.rows.slice(1) : []).filter((row) => row[0] === 'interaction-1');

    expect(failed).toEqual({ ok: false, error: 'server_error' });
    expect(retry.ok).toBe(true);
    expect(monthlyRows).toHaveLength(1);
    expect(monthlyRows[0][1]).toBe('11/02/2026');
  });

  it('retries a partial delete and records the tombstone after all rows are removed', () => {
    const script = createAppsScript();
    script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });
    const october = script.sheets.find((sheet) => sheet.getName() === 'OCT 2026');
    const november = script.createSheet('NOV 2026');
    november.rows.push([...october!.rows[0]], [...october!.rows[1]]);
    script.sheets.push(november);
    script.failAfterDeletes(1);
    const failed = script.doPostWithEvent({ action: 'delete', version: 2, payload: payload() });
    const retry = script.doPostWithEvent({ action: 'delete', version: 2, payload: payload() });
    const monthlyRows = script.sheets.flatMap((sheet) => /^[A-Z]{3} \d{4}$/.test(sheet.getName()) ? sheet.rows.slice(1) : []).filter((row) => row[0] === 'interaction-1');
    const state = script.sheets.find((sheet) => sheet.getName() === '_SYNC_STATE');

    expect(failed).toEqual({ ok: false, error: 'server_error' });
    expect(retry.ok).toBe(true);
    expect(monthlyRows).toHaveLength(0);
    expect(state?.rows[1]).toEqual(['interaction-1', 2, true]);
  });

  it('returns a retryable lock error without changing the spreadsheet', () => {
    const script = createAppsScript(false);
    const result = script.doPostWithEvent({ action: 'insert', version: 1, payload: payload() });

    expect(result).toEqual({ ok: false, error: 'lock_unavailable' });
    expect(script.sheetAccesses).toBe(0);
    expect(script.lockReleases).toBe(0);
  });

  it('rejects unknown root and payload fields before opening the spreadsheet', () => {
    const script = createAppsScript();
    const valid = { action: 'insert', version: 1, payload: payload() };

    expect(script.doPostWithEvent({ ...valid, unexpected: true })).toEqual({ ok: false, error: 'invalid_request' });
    expect(script.doPostWithEvent({ ...valid, payload: payload({ unexpected: true }) })).toEqual({ ok: false, error: 'invalid_request' });
    expect(script.sheetAccesses).toBe(0);
  });

  it('rejects malformed JSON, invalid versions, and invalid dates before sheet access', () => {
    const script = createAppsScript();
    const malformed = (context: any) => JSON.parse(context.doPost({ postData: { contents: '{' } }).contents);
    const invalid = (event: Record<string, unknown>) => script.doPostWithEvent(event);

    expect(malformed((script as any).context)).toEqual({ ok: false, error: 'invalid_request' });
    expect(invalid({ action: 'insert', version: 0, payload: payload() })).toEqual({ ok: false, error: 'invalid_request' });
    expect(invalid({ action: 'insert', version: 1, payload: payload({ date: '2026-02-31' }) })).toEqual({ ok: false, error: 'invalid_request' });
    expect(invalid({ action: 'insert', version: 1, payload: payload({ time: '99:99' }) })).toEqual({ ok: false, error: 'invalid_request' });
    expect(script.sheetAccesses).toBe(0);
  });
});
