/**
 * @file marketingFolders.ts
 * @description Catalog of Dunder Mifflin product marketing folders, branch media assets,
 * and Sabre portal collateral for support operations.
 */

export type MarketingCategory =
  | 'Workstations & Laptops'
  | 'Printers & Scanners'
  | 'Phones & Networks'
  | 'Enterprise Portals & Software'
  | 'Templates & Overlays';

export interface MarketingFolderItem {
  id: string;
  name: string;
  categories: MarketingCategory[];
  driveUrl: string;
  url?: string;
  description?: string;
}

export const MARKETING_CATEGORIES: MarketingCategory[] = [
  'Workstations & Laptops',
  'Printers & Scanners',
  'Phones & Networks',
  'Enterprise Portals & Software',
  'Templates & Overlays',
];

export const MARKETING_FOLDERS: MarketingFolderItem[] = [
  {
    id: 'dunder-paper-templates',
    name: 'Dunder Mifflin Premium Paper & Print Overlays',
    categories: ['Templates & Overlays'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Official 24lb bright white print frame borders, watermark assets, and corporate ream branding graphics.',
  },
  {
    id: 'dundie-awards-assets',
    name: 'The Dundies Ceremony Media & Golden Statue Presets',
    categories: ['Templates & Overlays'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Special Chili’s banquet presentation backdrops, golden statue overlays, and "Busiest Beaver" award certificate banners.',
  },
  {
    id: 'scranton-branch-workstations',
    name: 'Scranton Branch Workstation Showroom Assets',
    categories: ['Workstations & Laptops'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Complete marketing asset and collateral pack for Dunder Mifflin Workstations and Sabre Business Laptops.',
  },
  {
    id: 'sabre-business-portal-decks',
    name: 'Sabre Corporate Office & Enterprise Software Collateral',
    categories: ['Enterprise Portals & Software'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'High-concept promo decks and vector assets for Sabre HR Portal, Expense Manager, and Employee Portal.',
  },
  {
    id: 'vance-refrigeration-printers',
    name: 'Vance Refrigeration Commercial Office Printer Assets',
    categories: ['Printers & Scanners'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Collateral for heavy-duty Dunder Mifflin Office Printers and Sabre Document Scanners in commercial warehouses.',
  },
  {
    id: 'schrute-farms-security',
    name: 'Schrute Farms Security Console & Access Badging Media',
    categories: ['Phones & Networks'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Signage, badge layout templates, and tactical schematics for Sabre Access Badge Readers and Security Consoles.',
  },
  {
    id: 'threat-level-midnight-pack',
    name: 'Threat Level Midnight Action Promo Assets',
    categories: ['Templates & Overlays'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Secret agent Michael Scarn print filters, Goldenface laser overlays, and explosive action graphics.',
  },
  {
    id: 'mspc-sales-kit',
    name: 'Michael Scott Paper Co. Sales Portal & CRM Collateral',
    categories: ['Enterprise Portals & Software'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Compact closet-sized branch sales materials with DIY cheese puff flyers and discount tier brochures.',
  },
  {
    id: 'megadesk-multimonitor',
    name: 'Megadesk Tactical Surveillance & Workstation Displays',
    categories: ['Workstations & Laptops'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Multi-screen security command center graphics configured exclusively for Dwight’s triple-tier desktop.',
  },
  {
    id: 'wuphf-network-hub',
    name: 'WUPHF.com Universal Dispatch & VoIP Integration Hub',
    categories: ['Phones & Networks'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Ryan Howard-designed digital integration hub linking email, Dunder Mifflin VoIP System, SMS, and fax.',
  },
  {
    id: 'poor-richards-network',
    name: "Poor Richard's Pub Network & Switch Documentation",
    categories: ['Phones & Networks'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Network deployment diagrams and switch port topologies for commercial hospitality environments.',
  },
  {
    id: 'serenity-by-jan-ambience',
    name: 'Serenity by Jan Retail Order & Expense Portal Folders',
    categories: ['Enterprise Portals & Software'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Luxury spa retail collateral, inventory order templates, and candle scent pairing expense categories.',
  },
  {
    id: 'cafe-disco-video-meetings',
    name: 'Cafe Disco Video Meetings & Sound Hub Collateral',
    categories: ['Phones & Networks', 'Enterprise Portals & Software'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Sub-level basement celebration streaming assets, Sabre Conference Hub layouts, and party presentation decks.',
  },
  {
    id: 'finer-things-club-prints',
    name: 'The Finer Things Club Classic Office Document Templates',
    categories: ['Templates & Overlays'],
    driveUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&',
    description: 'Refined sepia document headers, teacup watermark accents, and French Renaissance typographic templates.',
  },
];
