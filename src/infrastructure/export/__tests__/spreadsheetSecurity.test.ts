import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupportInteraction } from '../../../domain/interaction/types';
import {
  exportToCSV,
  exportToExcel,
  formatInteractionForExcelClipboard,
  sanitizeSpreadsheetCell,
} from '../spreadsheetExporter';

const syntheticInteraction: SupportInteraction = {
  id: 'synthetic-1',
  createdAt: '2026-10-20T08:00:00.000Z',
  date: '2026-10-20',
  dayOfWeek: 'Tuesday',
  time: '08:00:00',
  agent: 'Taylor Agent',
  clientName: '=1+1',
  channel: 'Call',
  channelDetails: '+1-555-0100',
  clientProduct: '@SUM(1,1)',
  caseClassification: 'General question',
  status: 'Solved',
  license: 'support_inactive',
  inEvent: false,
  firstTimeUser: false,
  additionalNotes: '\t=1+1\n"quoted note"',
};

const formulaInputs = ['=1+1', '+1+1', '-1+1', '@SUM(1,1)', '  =1+1', '\t=1+1', '\n@SUM(1,1)', '\u0001=1+1'];

describe('spreadsheet literal text', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(formulaInputs)('neutralizes formula prefix %j', (input) => {
    expect(sanitizeSpreadsheetCell(input)).toBe(`'${input}`);
  });

  it('keeps ordinary phone text readable after spreadsheet import', () => {
    expect(sanitizeSpreadsheetCell('+1-555-0100')).toBe("'+1-555-0100");
  });

  it('encodes synthetic text fields and configurable labels in CSV', () => {
    const link = { click: vi.fn(), setAttribute: vi.fn(), style: {} };
    const body = { appendChild: vi.fn(), removeChild: vi.fn() };
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('document', {
      createElement: vi.fn(() => link),
      body,
    });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:synthetic'), revokeObjectURL: vi.fn() });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    let csv = '';
    vi.stubGlobal('Blob', class {
      constructor(parts: BlobPart[]) {
        csv = String(parts[0]);
      }
    });

    exportToCSV([syntheticInteraction], 'synthetic.csv', [
      { code: 'support_inactive', label: 'Support Inactive', exportLabel: '=1+1' },
    ]);

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(csv).toContain("\"'=1+1\"");
    expect(csv).toContain("\"'+1-555-0100\"");
    expect(csv).toContain("\"'@SUM(1,1)\"");
    expect(csv).toContain("\"'=1+1\"");
    expect(csv).toContain("\"'\t=1+1");
    expect(csv).toContain('""quoted note""');
  });

  it('keeps formula-like clipboard fields literal and prevents extra TSV cells', () => {
    const clipboard = formatInteractionForExcelClipboard({
      ...syntheticInteraction,
      clientName: 'Acme\t=1+1',
      additionalNotes: 'line one\n@SUM(1,1) "quoted"',
    }, [{ code: 'support_inactive', label: 'Support Inactive', exportLabel: '@SUM(1,1)' }]);
    expect(clipboard).toContain('\t"Acme\t=1+1"\t');
    expect(clipboard).toContain("\t'+1-555-0100\t'@SUM(1,1)\t");
    expect(clipboard).toContain('\t"line one\n@SUM(1,1) ""quoted"""\t');
    expect(clipboard).toContain("\t'@SUM(1,1)\t");
  });

  it('writes formula-like XLSX values as explicitly typed text cells', async () => {
    const toFile = vi.fn().mockResolvedValue(undefined);
    const writeXlsxFile = vi.fn(() => ({ toFile }));
    vi.doMock('write-excel-file/browser', () => ({ default: writeXlsxFile }));

    await exportToExcel([syntheticInteraction], 'synthetic.xlsx', [
      { code: 'support_inactive', label: 'Support Inactive', exportLabel: '=1+1' },
    ]);

    expect(writeXlsxFile).toHaveBeenCalledOnce();
    const [rows, options] = writeXlsxFile.mock.calls[0] as unknown as [Record<string, string>[], { columns: Array<{ cell: (row: Record<string, string>) => { type: unknown } }> }];
    expect(rows[0]['Client Name']).toBe('=1+1');
    expect(rows[0]['Channel Details']).toBe('+1-555-0100');
    expect(rows[0]['Client Product']).toBe('@SUM(1,1)');
    expect(rows[0]['Support License Eligibility']).toBe('=1+1');
    expect(rows[0]['Additional Notes']).toBe('\t=1+1\n"quoted note"');
    expect(options.columns.every((column) => column.cell(rows[0]).type === String)).toBe(true);
    expect(toFile).toHaveBeenCalledWith('synthetic.xlsx');
  });

  it('preserves leading and trailing customer whitespace in clipboard output', () => {
    const clipboard = formatInteractionForExcelClipboard({ ...syntheticInteraction, clientName: '  Acme  ' });
    expect(clipboard).toContain('\t  Acme  \t');
  });

  it('neutralizes every text field in the legacy Apps Script formatter and fails closed before sheet access', () => {
    const script = readFileSync('scripts/reference/google-sheets-v2-appscript.js', 'utf8');
    let sheetAccesses = 0;
    const context = {
      SpreadsheetApp: { getActiveSpreadsheet: () => { sheetAccesses += 1; throw new Error('sheet accessed'); } },
      LockService: { getScriptLock: () => { sheetAccesses += 1; throw new Error('lock accessed'); } },
      ContentService: {
        MimeType: { JSON: 'application/json' },
        createTextOutput: (content: string) => ({ content, setMimeType() { return this; } }),
      },
      Utilities: { formatDate: () => '08:00' },
      Logger: { log: vi.fn() },
    };
    runInNewContext(script, context);
    const row = runInNewContext(
      `formatInteractionRow(${JSON.stringify({
        id: 'synthetic-1', date: '=1+1', dayOfWeek: '+1+1', time: '08:00',
        agent: '-1+1', clientName: '@SUM(1,1)', channel: 'Call',
        channelDetails: '+1-555-0100', clientProduct: '=1+1',
        caseClassification: 'General', status: 'Solved', license: 'support_active',
        additionalNotes: '\\t=1+1',
      })})`,
      context
    ) as string[];
    const response = runInNewContext(`doPost({ parameter: {}, postData: { contents: '{}' } }).content`, context) as string;

    expect(row.slice(1).filter((value) => /^[\s\u0000-\u001f]*[=+\-@]/.test(value)).length).toBe(0);
    expect(row[7]).toBe("'+1-555-0100");
    expect(JSON.parse(response).success).toBe(false);
    expect(sheetAccesses).toBe(0);
  });

  it('rejects missing and placeholder legacy credentials', () => {
    const script = readFileSync('scripts/reference/google-sheets-v2-appscript.js', 'utf8');
    const context = { SpreadsheetApp: {}, LockService: {}, ContentService: {}, Utilities: {}, Logger: {} };
    runInNewContext(script, context);

    expect(runInNewContext(`hasUsableSecretToken('')`, context)).toBe(false);
    expect(runInNewContext(`hasUsableSecretToken('REPLACE_WITH_YOUR_SECRET_TOKEN')`, context)).toBe(false);
    expect(runInNewContext(`hasUsableSecretToken('your-random-32-byte-hex-token')`, context)).toBe(false);
    expect(runInNewContext(`hasUsableSecretToken('${'a'.repeat(64)}')`, context)).toBe(true);
  });
});
