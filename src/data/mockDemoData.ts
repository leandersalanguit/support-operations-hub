/**
 * @file mockDemoData.ts
 * @description Pre-configured mock personas, sample customer support interactions,
 * and CRM clients for the public interactive preview.
 */

import { SupportInteraction } from '../domain/interaction/types';
import { ClientProfile } from '../domain/client/types';
import { UserRole } from '../domain/identity/types';

export interface MockPersona {
  id: string;
  name: string;
  displayName: string;
  role: UserRole;
  roleTitle: string;
  email: string;
  avatarLetter: string;
  description: string;
}

export const MOCK_DEMO_PERSONAS: MockPersona[] = [
  {
    id: 'jim-halpert',
    name: 'Jim Halpert',
    displayName: 'Jim H.',
    role: 'support_agent',
    roleTitle: 'Support Agent',
    email: 'jhalpert@dundermifflin.demo',
    avatarLetter: 'J',
    description: 'Support Agent — standard operational permissions (edits own logs)',
  },
  {
    id: 'dwight-schrute',
    name: 'Dwight Schrute',
    displayName: 'Dwight S.',
    role: 'support_agent',
    roleTitle: 'Assistant TO THE Regional Manager (Support Agent)',
    email: 'dschrute@dundermifflin.demo',
    avatarLetter: 'D',
    description: 'Assistant TO THE Regional Manager — logs with rigorous discipline',
  },
  {
    id: 'michael-scott',
    name: 'Michael Scott',
    displayName: 'Michael S.',
    role: 'team_lead',
    roleTitle: 'Regional Manager / Team Lead',
    email: 'mscott@dundermifflin.demo',
    avatarLetter: 'M',
    description: 'Regional Manager / Team Lead — supervisor permissions (edits/deletes all logs)',
  },
];

export const DEFAULT_MOCK_PERSONA_ID = 'jim-halpert';

export function getMockPersonaById(id: string): MockPersona {
  return MOCK_DEMO_PERSONAS.find((p) => p.id === id) || MOCK_DEMO_PERSONAS[0];
}

/**
 * Generates initial mock CRM client profiles
 */
export function getMockInitialClients(): ClientProfile[] {
  const now = new Date().toISOString();

  return [
    {
      id: 'mock-client-dunder',
      name: 'Dunder Mifflin Scranton',
      phoneNumbers: ['+1 (570) 555-0145', '+1 (570) 555-0146'],
      phoneNumber: '+1 (570) 555-0145',
      ownedProducts: ['Dunder Mifflin Workstation', 'Dunder Mifflin Office Printer', 'Dunder Mifflin CRM'],
      createdAt: now,
      updatedAt: now,
      lastLoggedBy: 'Jim H.',
    },
    {
      id: 'mock-client-vance',
      name: 'Vance Refrigeration',
      phoneNumbers: ['+1 (570) 555-0199'],
      phoneNumber: '+1 (570) 555-0199',
      ownedProducts: ['Sabre Business Laptop', 'Dunder Mifflin Office Printer', 'Sabre Document Scanner'],
      createdAt: now,
      updatedAt: now,
      lastLoggedBy: 'Jim H.',
    },
    {
      id: 'mock-client-schrute',
      name: 'Schrute Farms B&B',
      phoneNumbers: ['+1 (570) 555-0123'],
      phoneNumber: '+1 (570) 555-0123',
      ownedProducts: ['Sabre Access Badge Reader', 'Sabre Security Console', 'Dunder Mifflin Desk Phone'],
      createdAt: now,
      updatedAt: now,
      lastLoggedBy: 'Dwight S.',
    },
    {
      id: 'mock-client-serenity',
      name: 'Serenity by Jan',
      phoneNumbers: ['+1 (570) 555-0177'],
      phoneNumber: '+1 (570) 555-0177',
      ownedProducts: ['Dunder Mifflin Order Manager', 'Sabre Expense Manager'],
      createdAt: now,
      updatedAt: now,
      lastLoggedBy: 'Michael S.',
    },
    {
      id: 'mock-client-mspc',
      name: 'Michael Scott Paper Company',
      phoneNumbers: ['+1 (570) 555-0188'],
      phoneNumber: '+1 (570) 555-0188',
      ownedProducts: ['Dunder Mifflin Sales Portal', 'Dunder Mifflin Desk Phone', 'Dunder Mifflin Customer Database'],
      createdAt: now,
      updatedAt: now,
      lastLoggedBy: 'Pam B.',
    },
    {
      id: 'mock-client-poor-richards',
      name: "Poor Richard's Pub",
      phoneNumbers: ['+1 (570) 555-0160'],
      phoneNumber: '+1 (570) 555-0160',
      ownedProducts: ['Dunder Mifflin Network Switch', 'Sabre Conference Hub'],
      createdAt: now,
      updatedAt: now,
      lastLoggedBy: 'Jim H.',
    },
  ];
}

/**
 * Generates initial mock support interactions with timestamps relative to current time
 */
export function getMockInitialInteractions(): SupportInteraction[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayNames[now.getDay()];

  const t1 = new Date(Date.now() - 1000 * 60 * 18);
  const t2 = new Date(Date.now() - 1000 * 60 * 42);
  const t3 = new Date(Date.now() - 1000 * 60 * 85);
  const t4 = new Date(Date.now() - 1000 * 60 * 135);
  const t5 = new Date(Date.now() - 1000 * 60 * 190);
  const t6 = new Date(Date.now() - 1000 * 60 * 250);

  const formatTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

  return [
    {
      id: 'mock-int-1',
      createdAt: t1.toISOString(),
      date: dateStr,
      dayOfWeek,
      time: formatTime(t1),
      agent: 'Jim H.',
      agentId: 'jim-halpert',
      clientId: 'mock-client-vance',
      clientName: 'Vance Refrigeration',
      channel: 'Call',
      channelDetails: '+1 (570) 555-0199',
      clientProduct: 'Dunder Mifflin Office Printer',
      caseClassification: 'Printer & Copier',
      status: 'Solved',
      inEvent: false,
      firstTimeUser: false,
      license: 'support_active',
      additionalNotes:
        'Bob Vance from Vance Refrigeration reported continuous paper feeder jams on their Dunder Mifflin Office Printer during monthly invoice batching. Guided caller through clearing roller feed tray 2, reseating the toner assembly, and cycling power. Successfully printed multi-page ream test sheets.',
    },
    {
      id: 'mock-int-2',
      createdAt: t2.toISOString(),
      date: dateStr,
      dayOfWeek,
      time: formatTime(t2),
      agent: 'Dwight S.',
      agentId: 'dwight-schrute',
      clientId: 'mock-client-schrute',
      clientName: 'Schrute Farms B&B',
      channel: 'Call',
      channelDetails: '+1 (570) 555-0123',
      clientProduct: 'Sabre Access Badge Reader',
      caseClassification: 'Security & Compliance',
      status: 'Solved',
      inEvent: false,
      firstTimeUser: false,
      license: 'support_active',
      additionalNotes:
        'Caller reported main beet cellar badge terminal failed RFID verification during shift change. Suspected corporate espionage by rival farm. Diagnosed loose PoE ethernet coupler at security perimeter gate. Recrimped and tested clearance protocols. [Logged by Dwight K. Schrute, Assistant TO THE Regional Manager. Case handled with maximum discipline.]',
    },
    {
      id: 'mock-int-3',
      createdAt: t3.toISOString(),
      date: dateStr,
      dayOfWeek,
      time: formatTime(t3),
      agent: 'Pam B.',
      agentId: 'pam-beesly',
      clientId: 'mock-client-dunder',
      clientName: 'Dunder Mifflin Scranton',
      channel: 'Chat',
      channelDetails: '#ticket-88219',
      clientProduct: 'Dunder Mifflin CRM',
      caseClassification: 'Sales Applications',
      status: 'Waiting for an update from client',
      inEvent: false,
      firstTimeUser: true,
      license: 'support_active',
      additionalNotes:
        'Kelly Kapoor contacted chat regarding missing client lead fields in Dunder Mifflin CRM after branch database sync. Provided updated field mappings and walked through client contact CSV export. Awaiting confirmation from sales desk.',
    },
    {
      id: 'mock-int-4',
      createdAt: t4.toISOString(),
      date: dateStr,
      dayOfWeek,
      time: formatTime(t4),
      agent: 'Michael S.',
      agentId: 'michael-scott',
      clientId: 'mock-client-mspc',
      clientName: 'Michael Scott Paper Company',
      channel: 'Call',
      channelDetails: '+1 (570) 555-0188',
      clientProduct: 'Dunder Mifflin Sales Portal',
      caseClassification: 'Order Management',
      status: 'Solved',
      inEvent: false,
      firstTimeUser: false,
      license: 'support_active',
      additionalNotes:
        'Caller inquired how to bulk discount 500 cases of 24lb cardstock in the Dunder Mifflin Sales Portal without triggering corporate margin alert lockouts. Advised on approved multi-ream price break tiers.',
    },
    {
      id: 'mock-int-5',
      createdAt: t5.toISOString(),
      date: dateStr,
      dayOfWeek,
      time: formatTime(t5),
      agent: 'Dwight S.',
      agentId: 'dwight-schrute',
      clientId: 'mock-client-poor-richards',
      clientName: "Poor Richard's Pub",
      channel: 'Call',
      channelDetails: '+1 (570) 555-0160',
      clientProduct: 'Dunder Mifflin Network Switch',
      caseClassification: 'Network & Connectivity',
      status: 'In progress',
      inEvent: false,
      firstTimeUser: false,
      license: 'support_inactive',
      additionalNotes:
        'Pub back-office ethernet drop dropped to 10Mbps half-duplex following an electrical surge during trivia night. Guided staff to run loopback diagnostics on port 8. [Logged by Dwight K. Schrute, Assistant TO THE Regional Manager. Case under ongoing tactical investigation.]',
    },
    {
      id: 'mock-int-6',
      createdAt: t6.toISOString(),
      date: dateStr,
      dayOfWeek,
      time: formatTime(t6),
      agent: 'Jim H.',
      agentId: 'jim-halpert',
      clientId: 'mock-client-serenity',
      clientName: 'Serenity by Jan',
      channel: 'Chat',
      channelDetails: '#ticket-94102',
      clientProduct: 'Sabre Expense Manager',
      caseClassification: 'HR & Employee Systems',
      status: 'Provided an alternative solution',
      inEvent: false,
      firstTimeUser: true,
      license: 'renewal_sent',
      additionalNotes:
        'Client requested custom candle wax inventory category in Sabre Expense Manager. Clarified ledger limitations and configured standard raw materials line item tag as direct workaround. Sent renewal documentation for Sabre enterprise suite.',
    },
  ];
}
