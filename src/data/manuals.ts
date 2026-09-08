/**
 * @file manuals.ts
 * @description Catalog of Dunder Mifflin operations manuals, Sabre hardware schematics,
 * assembly instructions, maintenance procedures, and Toby Flenderson safety guidelines.
 */

import { BaseResourceItem } from './resourceUtils';

export type ManualCategory =
  | 'User Manuals'
  | 'Wiring & Schematics'
  | 'Assembly & Teardown'
  | 'Maintenance & Service'
  | 'Safety & Compliance';

export type ManualFormat = 'PDF' | 'Interactive' | 'Document';

export interface ManualItem extends BaseResourceItem<ManualCategory> {
  format: ManualFormat;
  version?: string;
  fileSize?: string;
  compatibleProducts: string[];
  lastUpdated: string;
  pageCount?: number;
  fileUrl?: string;
}

export const MANUAL_CATEGORIES: ManualCategory[] = [
  'User Manuals',
  'Wiring & Schematics',
  'Assembly & Teardown',
  'Maintenance & Service',
  'Safety & Compliance',
];

export const MANUALS: ManualItem[] = [
  {
    id: 'dunder-scranton-operations-manual',
    name: 'Dunder Mifflin Scranton Branch Workstation Operator Manual',
    version: 'Rev 4.2',
    categories: ['User Manuals'],
    format: 'PDF',
    fileSize: '7.4 MB',
    pageCount: 52,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    compatibleProducts: ['Dunder Mifflin Workstation', 'Sabre Business Laptop', 'Dunder Mifflin Desk Phone'],
    lastUpdated: '2024-07-15',
    description: 'The standard branch operations guide. Features a preface by Regional Manager Michael Scott: "You miss 100% of the shots you don’t take. - Wayne Gretzky" - Michael Scott.',
  },
  {
    id: 'schrute-farms-barn-assembly-guide',
    name: 'Schrute Farms Barn Security & Perimeter Terminal Assembly Guide',
    version: 'Rev 3.1',
    categories: ['Assembly & Teardown'],
    format: 'PDF',
    fileSize: '8.8 MB',
    pageCount: 44,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    compatibleProducts: ['Sabre Access Badge Reader', 'Sabre Security Console'],
    lastUpdated: '2024-08-02',
    description: 'Field-tested instructions for erecting heavy steel security terminals on uneven dirt and straw. Important warning: Keep live power supplies at least 15 feet away from goat pens.',
  },
  {
    id: 'sabre-pyramid-hardware-schematic',
    name: 'Sabre Conference Hub & Audio Device Wiring Schematic',
    version: 'Rev 2.0',
    categories: ['Wiring & Schematics'],
    format: 'PDF',
    fileSize: '5.2 MB',
    pageCount: 36,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    compatibleProducts: ['Sabre Conference Hub', 'Dunder Mifflin VoIP System'],
    lastUpdated: '2024-06-12',
    description: 'Detailed internal wiring layouts, conference mic conduits, and acoustic dampening schematics for executive boardroom communication.',
  },
  {
    id: 'vance-refrigeration-printer-maintenance',
    name: 'Vance Refrigeration Heavy-Duty Office Printer Maintenance Guide',
    version: 'Rev 5.0',
    categories: ['Maintenance & Service'],
    format: 'PDF',
    fileSize: '6.1 MB',
    pageCount: 40,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    compatibleProducts: ['Dunder Mifflin Office Printer', 'Sabre Document Scanner'],
    lastUpdated: '2024-07-28',
    description: 'Certified by Bob Vance, Vance Refrigeration. Step-by-step procedures for clearing high-capacity paper jams, cleaning roller assemblies, and wiping condenser coils.',
  },
  {
    id: 'toby-flenderson-safety-compliance',
    name: 'Dunder Mifflin Environmental Health & Safety Compliance Guide',
    version: 'Rev 9.4',
    categories: ['Safety & Compliance'],
    format: 'PDF',
    fileSize: '12.3 MB',
    pageCount: 94,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    compatibleProducts: ['Dunder Mifflin Workstation', 'Dunder Mifflin Network Switch'],
    lastUpdated: '2024-08-08',
    description: 'Compiled by Human Resources Representative Toby Flenderson. Exhaustive protocols covering radon gas mitigation, paper cut triage, and Dwight’s fire drill aftermath.',
  },
  {
    id: 'dundies-ceremony-av-handbook',
    name: 'The Annual Dundie Awards Video & Presentation Production Handbook',
    version: 'Rev 18.0',
    categories: ['User Manuals', 'Maintenance & Service'],
    format: 'Interactive',
    fileSize: '9.6 MB',
    pageCount: 60,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    compatibleProducts: ['Dunder Mifflin Video Meetings', 'Sabre Conference Hub'],
    lastUpdated: '2024-08-14',
    description: 'Essential staging manual for Chili’s banquet rooms: wireless microphone feedback management, projector angles, and emergency manager walk-off music cues.',
  },
];
