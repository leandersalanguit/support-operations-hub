/**
 * @file quickStartGuides.ts
 * @description Catalog of Dunder Mifflin rapid setup guides, Dwight Schrute security drills,
 * and emergency triage workflows for Scranton branch station and terminal operators.
 */

import { BaseResourceItem } from './resourceUtils';

export type QuickStartCategory =
  | 'Setup Guides'
  | 'Operator Checklists'
  | 'Calibration & Tuning'
  | 'Emergency Troubleshooting';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface QuickStartGuideItem extends BaseResourceItem<QuickStartCategory> {
  estimatedTime: string;
  difficulty: DifficultyLevel;
  compatibleProducts: string[];
  lastUpdated: string;
  stepsCount?: number;
  guideUrl?: string;
}

export const QUICK_START_CATEGORIES: QuickStartCategory[] = [
  'Setup Guides',
  'Operator Checklists',
  'Calibration & Tuning',
  'Emergency Troubleshooting',
];

export const QUICK_START_GUIDES: QuickStartGuideItem[] = [
  {
    id: 'dunder-5min-speed-setup',
    name: 'Dunder Mifflin 5-Minute Workstation Setup (Michael Scott Speed Run)',
    categories: ['Setup Guides'],
    estimatedTime: '5 mins',
    difficulty: 'Beginner',
    compatibleProducts: ['Dunder Mifflin Workstation', 'Sabre Business Laptop'],
    stepsCount: 5,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    guideUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    lastUpdated: '2024-07-25',
    description: 'Rapid unboxing, single-power-cord hookup, ensuring Michael does not trip on the extension cable, and auto-booting the Scranton terminal suite.',
  },
  {
    id: 'dwight-perimeter-drill',
    name: 'Dwight Schrute 10-Point Pre-Event Perimeter & Security Drill',
    categories: ['Operator Checklists'],
    estimatedTime: '10 mins',
    difficulty: 'Intermediate',
    compatibleProducts: ['Sabre Access Badge Reader', 'Sabre Security Console'],
    stepsCount: 10,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    guideUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    lastUpdated: '2024-08-03',
    description: 'Strict physical verification: taping down all cords with industrial gaffer tape, testing stanchion barricades, and verifying no Jim Halpert pranks are active.',
  },
  {
    id: 'kevin-chili-spill-triage',
    name: 'Kevin Malone Emergency Chili Spill Triage Protocol',
    categories: ['Emergency Troubleshooting'],
    estimatedTime: '3 mins',
    difficulty: 'Advanced',
    compatibleProducts: ['Dunder Mifflin Workstation', 'Dunder Mifflin Office Printer', 'Dunder Mifflin Network Switch'],
    stepsCount: 4,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    guideUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    lastUpdated: '2024-08-11',
    description: 'CRITICAL: Cut main breaker immediately. Do NOT attempt to scoop carpet chili back into station vents using file folders. Sponge circuit boards with 99% isopropyl alcohol.',
  },
  {
    id: 'pam-watercolor-template-tuning',
    name: 'Pam Beesly Watercolor Print Template & Palette Quick-Tuning',
    categories: ['Calibration & Tuning'],
    estimatedTime: '7 mins',
    difficulty: 'Beginner',
    compatibleProducts: ['Dunder Mifflin Office Printer', 'Sabre Document Scanner'],
    stepsCount: 6,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    guideUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    lastUpdated: '2024-07-30',
    description: 'Quick guide to setting printer color balance, soft pastel borders, and subtle shadow contrasts for company anniversary portraits and reception prints.',
  },
  {
    id: 'jim-prank-tamper-checklist',
    name: 'Jim Halpert Prank Detection & Hardware Tamper Troubleshooting',
    categories: ['Emergency Troubleshooting'],
    estimatedTime: '8 mins',
    difficulty: 'Intermediate',
    compatibleProducts: ['Dunder Mifflin Desk Phone', 'Dunder Mifflin Workstation', 'Sabre Business Laptop'],
    stepsCount: 7,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    guideUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    lastUpdated: '2024-08-06',
    description: 'Rapid diagnostic checklist for unexplained terminal behavior: checking if the mouse sensor is covered with a picture of Michael, or if the handset is encased in lime Jell-O.',
  },
  {
    id: 'jan-scented-candle-lighting-guide',
    name: 'Jan Levinson Corporate Ambience & Conference Hub Setup',
    categories: ['Calibration & Tuning'],
    estimatedTime: '12 mins',
    difficulty: 'Beginner',
    compatibleProducts: ['Sabre Conference Hub', 'Dunder Mifflin Video Meetings'],
    stepsCount: 6,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    guideUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    lastUpdated: '2024-07-18',
    description: 'Tuning conference hub ambient lighting and mic acoustics between 2800K and 3200K to complement "Bonfire", "Crisp Clean Paper", and "Serenity" executive suites.',
  },
];
