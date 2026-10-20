import { strFromU8, unzipSync } from 'fflate';
import writeXlsxFile from 'write-excel-file/node';
import { afterEach, expect, it, vi } from 'vitest';
import { exportToExcel } from '../spreadsheetExporter';
import type { SupportInteraction } from '../../../domain/interaction/types';

afterEach(() => vi.doUnmock('write-excel-file/browser'));

it('generates a real XLSX download with literal text and no formulas', async () => {
  let downloadedFile: Buffer | undefined;
  let downloadedName: string | undefined;
  vi.doMock('write-excel-file/browser', () => ({
    default: (...args: Parameters<typeof writeXlsxFile>) => {
      const workbook = writeXlsxFile(...args);
      return {
        toFile: async (name: string) => {
          downloadedName = name;
          downloadedFile = await workbook.toBuffer();
        },
      };
    },
  }));
  const interaction: SupportInteraction = {
    id: 'synthetic-xlsx', createdAt: '2026-10-20T00:00:00Z',
    date: '2026-10-20', dayOfWeek: 'Tuesday', time: '08:00', agent: 'Taylor Agent',
    clientName: '=1+1', channel: 'Call', channelDetails: '+1-555-0100',
    clientProduct: '@SUM(1,1)', caseClassification: '-1+1', status: 'Solved',
    license: 'support_active', inEvent: false, firstTimeUser: false,
    additionalNotes: '\t=1+1\n"quoted"',
  };
  await exportToExcel([interaction], 'literal-text.xlsx');
  expect(downloadedName).toBe('literal-text.xlsx');
  expect(downloadedFile).toBeDefined();
  const files = unzipSync(downloadedFile!);
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  const xml = Object.entries(files).filter(([name]) => name.endsWith('.xml'))
    .map(([, data]) => strFromU8(data)).join('\n');
  expect(sheet).not.toMatch(/<f(?:\s|>)/);
  expect(sheet).toMatch(/t="(?:s|inlineStr)"/);
  expect(xml).toContain('=1+1');
  expect(xml).toContain('@SUM(1,1)');
  expect(xml).toContain('+1-555-0100');
});
