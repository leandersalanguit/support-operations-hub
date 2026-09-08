/**
 * @file installers.ts
 * @description Official directory of software installers, driver utilities, and firmware patches
 * for Dunder Mifflin document workstations, Sabre hardware, and Scranton branch kiosks.
 */

import { BaseResourceItem } from './resourceUtils';

export type InstallerCategory =
  | 'Core Software'
  | 'Camera Drivers & Utilities'
  | 'Printer Drivers'
  | 'Utilities & Tools'
  | 'Firmware & Patches';

export interface InstallerItem extends BaseResourceItem<InstallerCategory> {
  version: string;
  downloadUrl: string;
  fileSize: string;
  operatingSystem: string;
  releaseDate: string;
  compatibleProducts?: string[];
  checksum?: string;
}

export const INSTALLER_CATEGORIES: InstallerCategory[] = [
  'Core Software',
  'Camera Drivers & Utilities',
  'Printer Drivers',
  'Utilities & Tools',
  'Firmware & Patches',
];

export const INSTALLERS: InstallerItem[] = [
  {
    id: 'dunder-paperless-portal',
    name: 'Dunder Mifflin Paperless Portal Pro Suite',
    version: 'v4.5.2',
    categories: ['Core Software'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    downloadUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileSize: '192 MB',
    operatingSystem: 'Windows 11 / 10 (64-bit)',
    releaseDate: '2024-08-15',
    compatibleProducts: ['Dunder Mifflin Workstation', 'Sabre Business Laptop'],
    description: 'Flagship Scranton branch interactive terminal software engine with live preview, AI background replacement, and instant ream invoice generation.',
  },
  {
    id: 'sabre-pyramid-os',
    name: 'Sabre Pyramid OS & Triangular Tablet Runtime',
    version: 'v2.1.0',
    categories: ['Core Software'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    downloadUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileSize: '145 MB',
    operatingSystem: 'SabreOS 2.0 / Windows 11',
    releaseDate: '2024-07-20',
    compatibleProducts: ['Sabre Business Laptop', 'Sabre Conference Hub'],
    description: 'Custom touchscreen runtime built specifically for Sabre’s 3-sided triangular hardware. Certified by Florida corporate headquarters.',
  },
  {
    id: 'schrute-beet-vision-driver',
    name: 'Schrute Beet-Vision Camera Calibration Utility',
    version: 'v3.2.1',
    categories: ['Camera Drivers & Utilities'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    downloadUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileSize: '78 MB',
    operatingSystem: 'Windows 11 / 10',
    releaseDate: '2024-06-18',
    compatibleProducts: ['Dunder Mifflin Video Meetings', 'Sabre Conference Hub'],
    description: 'High-contrast optical utility calibrated to ensure beet root purples, golden hay bales, and barn timber tones render with maximum vividness.',
  },
  {
    id: 'vance-subzero-thermal-driver',
    name: 'Vance Refrigeration Thermal Sub-Zero Print Driver',
    version: 'v1.9.4',
    categories: ['Printer Drivers'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    downloadUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileSize: '46 MB',
    operatingSystem: 'Windows 11 / 10 (32/64-bit)',
    releaseDate: '2024-05-12',
    compatibleProducts: ['Dunder Mifflin Office Printer', 'Sabre Print Manager'],
    description: 'High-speed printer driver calibrated by Bob Vance to maintain thermal head consistency inside refrigerated and warehouse environments.',
  },
  {
    id: 'wuphf-sync-dispatcher',
    name: 'WUPHF.com Universal Dispatcher & Social Broadcaster',
    version: 'v1.0.4',
    categories: ['Utilities & Tools'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    downloadUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileSize: '64 MB',
    operatingSystem: 'Windows 11 / macOS 14+',
    releaseDate: '2024-07-04',
    compatibleProducts: ['Dunder Mifflin Email', 'Dunder Mifflin VoIP System', 'Sabre FileShare'],
    description: 'Automated sharing pipeline created by Ryan Howard. Simultaneously broadcasts completed digital document notifications via text, email, Twitter, fax, and 90s digital pager.',
  },
  {
    id: 'threat-level-midnight-lut-pack',
    name: 'Threat Level Midnight Action Color Grading Package',
    version: 'v5.0.0',
    categories: ['Utilities & Tools'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    downloadUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileSize: '112 MB',
    operatingSystem: 'Windows 11 / 10',
    releaseDate: '2024-08-01',
    compatibleProducts: ['Dunder Mifflin Video Meetings', 'Sabre Office Suite'],
    description: 'Dramatic high-octane Hollywood color profiles: Michael Scarn Grayscale, Goldenface Laser Glow, and Cherokee Jack Campfire Gold.',
  },
  {
    id: 'dunder-spooler-buffer-patch',
    name: 'Dunder Mifflin Ream-Master 5000 Spooler Patch',
    version: 'v2.8.4',
    categories: ['Firmware & Patches'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    downloadUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileSize: '24 MB',
    operatingSystem: 'Firmware Update Tool',
    releaseDate: '2024-08-10',
    compatibleProducts: ['Dunder Mifflin Office Printer', 'Sabre Print Manager'],
    description: 'Critical firmware hotfix preventing print spooler queue crashes when printing 500 Dundee Award certificates in rapid succession.',
  },
  {
    id: 'megadesk-multimonitor-driver',
    name: 'Megadesk Tactical Quad-Display Driver Utility',
    version: 'v4.0.1',
    categories: ['Utilities & Tools'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    downloadUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    fileSize: '82 MB',
    operatingSystem: 'Windows 11 (64-bit)',
    releaseDate: '2024-06-25',
    compatibleProducts: ['Dunder Mifflin Workstation', 'Sabre Security Console'],
    description: 'Allows simultaneous management of 4 high-definition surveillance and live document preview streams across Dwight’s Megadesk setup.',
  },
];
