/**
 * @file recommendedHardware.ts
 * @description Official directory of certified hardware components for Dunder Mifflin event operations,
 * including cameras, dye-sub printers, Sabre mobile terminals, and Schrute Security barricades.
 */

import { BaseResourceItem } from './resourceUtils';

export type HardwareCategory =
  | 'Cameras & Optics'
  | 'Printers & Media'
  | 'Computers & Mini PCs'
  | 'Lighting & Flash'
  | 'Displays & Touchscreens'
  | 'Peripherals & Accessories';

export type HardwareStatus = 'Recommended' | 'Certified Compatible' | 'Legacy Supported';

export interface RecommendedHardwareItem extends BaseResourceItem<HardwareCategory> {
  status: HardwareStatus;
  modelNumber?: string;
  specifications: string;
  compatibleProducts: string[];
  notes?: string;
  estimatedPrice?: string;
}

export const HARDWARE_CATEGORIES: HardwareCategory[] = [
  'Cameras & Optics',
  'Printers & Media',
  'Computers & Mini PCs',
  'Lighting & Flash',
  'Displays & Touchscreens',
  'Peripherals & Accessories',
];

export const RECOMMENDED_HARDWARE: RecommendedHardwareItem[] = [
  {
    id: 'canon-scranton-workhorse',
    name: 'Canon EOS Rebel T7 (Scranton Branch Workhorse Edition)',
    modelNumber: '2727C002-DM',
    categories: ['Cameras & Optics'],
    status: 'Recommended',
    specifications: '24.1 MP APS-C Sensor, Full HD 1080p live tethering, AC Continuous Coupler Kit.',
    compatibleProducts: ['Dunder Mifflin Workstation', 'Dunder Mifflin Video Meetings'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    notes: 'The undisputed workhorse of the Scranton branch. Ensure auto-power off is disabled before events.',
    estimatedPrice: '$479.99',
    description: 'Ultra-reliable DSLR camera certified for full 12-hour continuous shift shooting at paper conventions and warehouse events.',
  },
  {
    id: 'dnp-ream-master-printer',
    name: 'DNP DS620A Dye-Sub Printer (Dunder Mifflin Ream Certified)',
    modelNumber: 'DS620A-DM',
    categories: ['Printers & Media'],
    status: 'Recommended',
    specifications: 'High-speed 400 prints/hour, 300x300 dpi glossy/matte, 2x6 and 4x6 print media.',
    compatibleProducts: ['Dunder Mifflin Office Printer', 'Sabre Print Manager'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    notes: 'Approved for printing on premium Dunder Mifflin 24-pound glossy photo ream media. Thermal head lasts up to 100,000 cuts.',
    estimatedPrice: '$799.00',
    description: 'Gold-standard high-capacity dye-sublimation printer designed for non-stop Dundie award certificate printing.',
  },
  {
    id: 'sabre-pyramid-tablet',
    name: 'Sabre Pyramid Mobile Capture Tablet (Florida Special)',
    modelNumber: 'PYR-3000',
    categories: ['Displays & Touchscreens', 'Computers & Mini PCs'],
    status: 'Certified Compatible',
    specifications: '3-sided triangular HD display, 4GB RAM, 64GB SSD, integrated 8MP camera.',
    compatibleProducts: ['Sabre Business Laptop', 'Sabre Remote Access'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    notes: 'Ergonomically shaped like a pyramid for maximum corporate power. Weighs less than 3 pounds.',
    estimatedPrice: '$299.99',
    description: 'Sabre’s visionary triangular touchscreen tablet. Perfect for taking 360 videos while maintaining superior business posture.',
  },
  {
    id: 'vance-subzero-cooling-fan',
    name: 'Vance Refrigeration Industrial High-Velocity Cooling Blower',
    modelNumber: 'VR-COOL-90',
    categories: ['Peripherals & Accessories'],
    status: 'Recommended',
    specifications: '120mm dual-ball bearing fan, 180 CFM airflow, moisture-sealed motor casing.',
    compatibleProducts: ['Dunder Mifflin Workstation', 'Dunder Mifflin Network Switch'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    notes: 'Manufactured and personally inspected by Bob Vance, Vance Refrigeration. Prevents thermal throttling during hot outdoor events.',
    estimatedPrice: '$89.50',
    description: 'Heavy-duty cooling unit engineered to keep terminal computers ice-cold even under direct Pennsylvania summer sun.',
  },
  {
    id: 'angela-approved-mini-pc',
    name: 'Intel NUC Mini PC (Angela Martin Accounting Certified)',
    modelNumber: 'NUC13-ANG',
    categories: ['Computers & Mini PCs'],
    status: 'Recommended',
    specifications: 'Intel Core i5-1340P, 16GB DDR5, 512GB NVMe, Energy Star certified, zero RGB lights.',
    compatibleProducts: ['Dunder Mifflin Workstation', 'Sabre Security Console'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    notes: 'Strictly auditing-approved: no noisy fans, no colorful gamer lighting, 100% focused on business efficiency.',
    estimatedPrice: '$549.00',
    description: 'Ultra-compact, whisper-quiet micro computer running the core Dunder Mifflin portal without unnecessary distractions.',
  },
  {
    id: 'schrute-security-stanchions',
    name: 'Schrute Security Cast-Iron Crowd Control Stanchions (Pair)',
    modelNumber: 'SCH-IRON-2X',
    categories: ['Peripherals & Accessories'],
    status: 'Recommended',
    specifications: 'Solid 22-pound cast iron bases, 6.5-foot heavy red velvet ropes, polished brass finials.',
    compatibleProducts: ['Sabre Access Badge Reader', 'Sabre Security Console'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    notes: 'Dwight-tested crowd barrier. Capable of withstanding unruly guests, wedding line-cutters, and small livestock.',
    estimatedPrice: '$159.00',
    description: 'Indestructible cast-iron perimeter stanchions designed to establish safe operating boundaries around moving spin platforms.',
  },
  {
    id: 'godox-dundie-spotlight',
    name: 'Godox V1 Round-Head Flash (Dundie Spotlight Edition)',
    modelNumber: 'V1C-DUNDIE',
    categories: ['Lighting & Flash'],
    status: 'Recommended',
    specifications: '76Ws round flash head, 2.4G wireless X-system, magnetic modifier mount, 480 full-power pops per charge.',
    compatibleProducts: ['Dunder Mifflin Video Meetings', 'Sabre Conference Hub'],
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    notes: 'Soft circular falloff makes every employee look like a Dundie award winner. Includes magnetic diffusion dome.',
    estimatedPrice: '$259.00',
    description: 'Premium on-camera flash providing smooth, flattering facial illumination for branch celebrations and banquets.',
  },
];
