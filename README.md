# Support Operations Hub (Customer Interaction & Shift Tracking System)

<div align="center">

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%7C%20Postgres%20%7C%20Realtime-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com/)

**A resilient, modern, high-performance customer interaction logging, shift tracking, and client operations hub engineered for 24/7 technical support teams, shift leads, and support agents.**

</div>

---

> [NOTE]
> **A Quick Heads-Up**
>
> Just a heads-up: this repository came from a private repository with proprietary information. I stripped all vendor references as much as possible—cleaning up company branding, client identities, internal drive links, and private URLs.
>
> To make the public demo easy and fun to explore without requiring a Supabase account or private credentials, the [demo preview](https://leandersalanguit.github.io/support-operations-hub/) runs entirely on mock data themed with **The Office / Dunder Mifflin** references (featuring personas like Jim Halpert, Dwight Schrute, and Michael Scott, alongside fictional Scranton branch products, clients, and interaction logs).


---

## 📋 Table of Contents

- [🌟 Overview](#-overview)
- [🚀 Key Features](#-key-features)
  - [1. Agent Authentication & Zero-Trust Gatekeeper](#1-agent-authentication--zero-trust-gatekeeper)
  - [2. Role-Based Permissions & Policies](#2-role-based-permissions--policies)
  - [3. High-Velocity Dual-View Interaction Logging](#3-high-velocity-dual-view-interaction-logging)
  - [4. Clipboard Excel & Sheets One-Click Fast-Paste](#4-clipboard-excel--sheets-one-click-fast-paste)
  - [5. Dedicated Client CRM Directory](#5-dedicated-client-crm-directory)
  - [6. Generic Taxonomies & Dynamic Cloud Catalogs](#6-generic-taxonomies--dynamic-cloud-catalogs)
  - [7. Real-Time Shift Statistics Dashboard](#7-real-time-shift-statistics-dashboard)
  - [8. Interactive History & Data Management Table](#8-interactive-history--data-management-table)
  - [9. Dedicated Audit Trails (Edit & Delete Logs)](#9-dedicated-audit-trails-edit--delete-logs)
  - [10. Offline-First Resilience & Postgres Realtime WebSockets](#10-offline-first-resilience--postgres-realtime-websockets)
  - [11. One-way Google Sheets Sync](#11-one-way-google-sheets-sync)
  - [12. Advanced Reporting & OWASP-Sanitized Data Export](#12-advanced-reporting--owasp-sanitized-data-export)
  - [13. Operations Hub & Collapsible Sidebar Navigation](#13-operations-hub--collapsible-sidebar-navigation)
  - [14. Ergonomic Dark Mode & Shift-Optimized Theming](#14-ergonomic-dark-mode--shift-optimized-theming)
- [🏗 Architecture & Directory Structure](#-architecture--directory-structure)
- [🛠 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Development Server](#development-server)
  - [Production Build & Verification](#production-build--verification)
- [🗄 Database Setup & Supabase Schema](#-database-setup--supabase-schema)
- [📊 Google Sheets Pilot Status](#-google-sheets-pilot-status)
- [🔒 Security & Threat Mitigation](#-security--threat-mitigation)
- [📄 License & Commercial Licensing](#-license--commercial-licensing)

---

## 🌟 Overview

The **Support Operations Hub** unifies daily technical support workflows, agent accountability, client CRM records, and operational assets into a single centralized interface:

- **Authenticated Agent Access**: Supabase Auth gatekeeping with handle normalization (`agent.name` to `@shift.local`), mandatory first-time password resets, and agent identity locking.
- **Fast-Paced Shift Logging**: Dual-view logging forms (Vertical and compact Grid views) with keyboard shortcuts (<kbd>Ctrl</kbd> + <kbd>Enter</kbd>), phone validation, ticket link parsing, and automatic date/time resolution.
- **Spreadsheet Clipboard Integration**: One-click modal to paste, validate, parse, and populate form fields from a single copied Excel or Google Sheets row.
- **Client Directory (CRM)**: Instant client lookup, autocomplete, multi-phone contact management with copy-to-clipboard, and equipment ownership records that update automatically as interactions are logged.
- **Live Real-Time Sync**: Multi-agent synchronization over PostgreSQL Realtime WebSockets, keeping all active team members in sync instantly without manual page refreshes.
- **Offline Reliability**: Optimistic UI updates backed by a FIFO offline queue that caches transactions locally during network disruptions and auto-flushes upon reconnection.
- **Immutable Audit Trails**: Enterprise change management recording before-and-after JSON snapshots for all edited and deleted interaction logs.
- **Google Sheets**: A one-way, server-side sync is available after deployment configuration. Supabase remains canonical. CSV, XLSX, and clipboard exports remain available.
- **Reporting & Data Portability**: Live KPI calculations, multi-dimensional search/filtering, and sanitized exports for both native Excel (`.xlsx`) and RFC-4180 CSV with OWASP formula injection protection.
- **Ergonomic Theming**: Full-featured Dark Mode with deep slate surfaces (`slate-900` / `slate-950`) engineered for extended day and overnight shifts.

---

## 🚀 Key Features

### 1. Agent Authentication & Zero-Trust Gatekeeper
- **Authentication Gatekeeper (`AuthModal.tsx`)**: Unauthenticated users are presented with a modal gate requiring verified credentials before accessing shift data.
- **Flexible Handle / Email Sign-In**: Supports signing in with either a short handle (e.g. `agent.smith`, normalized automatically to `agent.smith@shift.local`) or a full email address.
- **Mandatory First-Time Password Reset**: Detects temporary or newly provisioned credentials (`must_change_password` flag) and enforces updating passwords before dashboard access is permitted.
- **Zero-Trust Leaked Password Defense (HaveIBeenPwned k-Anonymity)**: Client-side compromised password defense using the HaveIBeenPwned k-Anonymity API. When agents change or create passwords, the browser Web Crypto API generates a SHA-1 hash and queries HaveIBeenPwned using only the first 5 characters of the hash prefix. Neither the password nor its full hash ever leaves the device.
- **Agent Identity Locking**: Interaction entries are bound to the authenticated agent's verified display name, preventing identity spoofing across shifts.
- **Profile Card & One-Click Sign-Out**: Sidebar displays current agent name, avatar badge, role tag, and one-click session sign-out.

### 2. Role-Based Permissions & Policies
- **Role Hierarchy**: Supports **Team Leads** (`team_lead`) and **Support Agents** (`support_agent`).
- **Modification Policy (`canModifyInteractionPolicy`)**:
  - Support agents are authorized to edit and delete only the interactions they personally created.
  - Team Leads have full administrative authority to edit or delete any entry across the entire team.
- Unauthorized edit/delete attempts are safely blocked at both domain and UI layers with clear feedback.

### 3. High-Velocity Dual-View Interaction Logging
- **Vertical View**: A comprehensive step-by-step layout grouped into four logical sections:
  1. *General & Client Information* (Date, Day of Week, Agent, Client / Company Name).
  2. *Communication Channel* (Call with Phone # or Chat with ticket link/ID).
  3. *Product & Case Details* (Product selector, Case Classification, Status).
  4. *Support Eligibility & Verification* (Support License, Inactive Support options, In-Event status, First-Time User flag, and Additional Notes).
- **Grid View**: A compact multi-column view optimized for rapid sequential entries during high-volume call shifts.
- **View Persistence**: Saves agent view mode preferences in `localStorage`.
- **Client Autocomplete & Pre-fill**: Typing a client name auto-suggests matching profiles and automatically populates their known equipment and contact numbers.
- **Context-Aware Channel Fields**:
  - Selecting **Call** validates and formats contact phone numbers (`+1 (555) 000-0000`).
  - Selecting **Chat** parses ticket numbers or URLs into compact badges.
- **Auto Date & Day Resolution**: Accurately determines day of the week and timestamps without timezone drift.
- **Smooth Auto-Scroll Easing**: On submit, smoothly animates the viewport directly to the data table using a cubic easing engine.
- **Keyboard Shortcut**: Instant form submission using <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (or <kbd>Cmd</kbd> + <kbd>Enter</kbd> on macOS).

### 4. Clipboard Excel & Sheets One-Click Fast-Paste
- **Spreadsheet Row Parser (`PasteExcelModal.tsx` & `importParser.ts`)**: Copy any row from an existing Excel sheet or Google Spreadsheet and paste it directly into the modal.
- **Auto-Parsing & Column Mapping**: Intelligently extracts and maps:
  - Date (converts various formats into `YYYY-MM-DD` and resolves day of week)
  - Agent and Client Name
  - Channel (Call vs Chat) and associated detail (Phone number / Ticket ID)
  - Product Name and Case Classification
  - Resolution Status and Support License tier
  - In-Event and First-Time User boolean flags
  - Freeform notes
- **Live Preview & Validation**: Displays an interactive preview of all parsed attributes with inline validation alerts before applying the data to the interaction form.

### 5. Dedicated Client CRM Directory
- **Centralized Client Database (`ClientDirectory.tsx`)**: Browse, search, add, edit, and delete client company profiles.
- **Multiple Phone Numbers**: Store and manage multiple contact numbers per client with one-click clipboard copying.
- **Equipment & Product Tracking**: Track hardware units and software systems registered to each client.
- **Automatic Interaction Ingestion**: Logging a support interaction automatically upserts new clients, associates new phone numbers, and records product ownership in the background.
- **Manual Client Form Modal (`ClientFormModal.tsx`)**: Dedicated modal for creating and updating client profiles, primary contacts, and assigned products.
- **List & Grid Layouts**: Toggle between a dense tabular list and a visual grid card layout.

### 6. Generic Taxonomies & Dynamic Cloud Catalogs
- **Default Generic Hardware & Software**: Built-in unbranded products.
- **Comprehensive Case Classifications**: Unbranded technical support categories.
- **Dynamic Cloud Catalog Loading (`useTaxonomies.ts` & `configRepo.ts`)**: Seamlessly fetches database-configured taxonomies from PostgreSQL when available (`catalog_products`, `catalog_classifications`, `marketing_resources`, `support_tiers`), falling back cleanly to local mock data when offline.

### 7. Real-Time Shift Statistics Dashboard
- **Today's Shift Logs**: Shows total interactions logged today alongside cumulative historical records.
- **Solved Ratio**: Displays the number of solved cases today with a live-calculated resolution percentage (`% resolved`).
- **In-Event Active Cases**: Highlights urgent, high-priority interactions where a client is actively operating at a live event.
- **Follow-Up / Waiting**: Tracks open tickets requiring client updates or pending internal agent follow-up.
- **Channel Breakdown**: Compares Phone Calls vs. Chats for the current shift.

### 8. Interactive History & Data Management Table
- **Multi-Field Search**: Real-time filtering across Client Name, Agent Name, Product, Classification, Channel Details, and Notes.
- **Multi-Dimensional Filters**: Filter by Date (All, Today, Custom), Channel, Status, Product, or In-Event flag.
- **Deterministic Sorting**: Multi-tier sort by date and timestamps.
- **Clickable Ticket Badges**: Full ticket URLs or IDs are formatted into compact, clickable `#ID ↗` pills based on the configured helpdesk template (`VITE_HELPDESK_TICKET_URL`).
- **Expandable Notes**: Notes feature line clamping with "Read more" / "Show less" toggles.
- **Visual Status Badges**: Color-coded status pills and attribute indicators for Support License eligibility, Live Event status, and First-Time User flags.

### 9. Dedicated Audit Trails (Edit & Delete Logs)
- **Transactional Interaction Audit (`interaction_audit_events`)**: The database trigger records each committed insert, update, and delete with the actor UUID, database time, and reviewed before/after snapshots. An audit failure rolls back the interaction change.
- **Legacy Audit History**: `interaction_edits_audit` and `deleted_interactions_audit` remain restricted historical data. The candidate app no longer writes to them. Their historical completeness is not verified.

### 10. Offline-First Resilience & Postgres Realtime WebSockets
- **Postgres Realtime WebSockets**: Multi-agent synchronization updates all active screens without page refreshes.
- **Optimistic UI Updates**: Interactions appear in the UI immediately upon submission.
- **Zero-Latency Local Cache**: Bootstraps cached state from `localStorage` instantly (0ms startup latency) before verifying cloud data.
- **FIFO Offline Queue (`useSyncPipeline.ts`)**: Queues failed or offline operations locally. Listens for browser `online` events and triggers background retries with visual status indicators (`Connected`, `Syncing...`, `Offline`, `Sync Error`).

### 11. One-way Google Sheets Sync

Committed interaction changes enter a private Supabase outbox. A scheduled Edge Function sends them to Google Sheets. The browser never sends interaction data to Google.

The master-sheet shortcut uses the approved public Sheets URL. Sync stays disabled until the server secrets, Apps Script writer deployment, restricted sharing, and scheduled worker are configured. Disable any old endpoint that used a URL token and rotate its old token before deployment.

See [Google Sheets sync deployment](docs/google-sheets-sync-deployment.md) for setup and shutdown steps.

### 12. Advanced Reporting & OWASP-Sanitized Data Export
- **CSV Export**: RFC-4180 compliant CSV generator with **OWASP CSV injection protection** (sanitizes `=, +, -, @, \t, \r` formula prefixes to prevent spreadsheet command execution).
- **Native Excel Export**: Uses `write-excel-file` to generate formatted `.xlsx` workbooks with auto-calculated column widths, header styling, and cell type formatting.
- **Filtered Export**: Export either the entire database or only the filtered table view.

### 13. Operations Hub & Collapsible Sidebar Navigation
- **Multi-Tab Navigation**:
  - 📊 **Shift Summary**: Master logging dashboard, KPI stats, and interactive data table.
  - 👥 **Client Directory**: Client CRM directory, phone manager, and equipment list.
  - 🔗 **Product Portals**: Dedicated workspaces for Installers, Marketing Folders, Quick Start Guides, Hardware Specs, Manuals, and Renewal Links.
- **Responsive Modes**: Toggle between full desktop sidebar (256px), compact icon rail (80px), or mobile drawer overlay.

### 14. Ergonomic Dark Mode & Shift-Optimized Theming
- **Intelligent Theme Detection**: Automatically loads user preference from `localStorage`, falling back to OS hardware preference (`prefers-color-scheme: dark`).
- **Ergonomic Slate Palette**: Neutral deep slate backgrounds (`slate-900` / `slate-950`) paired with a modern cyan/sky operational accent scale to reduce eye strain during extended night shifts.
- **Custom Dark Scrollbars & Contrast Tuning**: Polished scrollbars, crisp borders, and accessible text contrast across all components and modals.

---

## 🏗 Architecture & Directory Structure

The project follows a clean, layered frontend architecture separating pure business domain logic, application state workflows, infrastructure adapters, and UI components:

```
support-operations-hub/
├── public/                          # Static assets, vector emblem, favicons
├── src/
│   ├── application/                 # Application workflow hooks & coordinators
│   │   ├── useAuthWorkflow.ts             # Auth session, gatekeeper, profile resolution
│   │   ├── useClientDirectory.ts          # Client CRM state, search, and optimistic updates
│   │   ├── useClientMatch.ts              # Fuzzy autocompletion for clients, phones & products
│   │   ├── useInteractionWorkflow.ts      # Interaction CRUD, Realtime sync, audit triggers
│   │   ├── useSyncPipeline.ts             # Offline retry queue & reconnection listeners
│   │   ├── useTaxonomies.ts               # Dynamic product & classification catalog loader
│   │   └── index.ts                       # Application barrel export
│   │
│   ├── domain/                      # Pure domain layer (zero external framework dependencies)
│   │   ├── agent/                         # Agent profiles and permission policies
│   │   ├── client/                        # Client profile types, phone sanitizer, name resolver
│   │   │   ├── diff.ts                    # Pure client attribute comparison & diff calculation
│   │   │   ├── nameResolution.ts          # Company name cleaner & canonicalization
│   │   │   ├── phone.ts                   # Phone formatting & international sanitization
│   │   │   ├── repository.ts              # Client repository interface contract
│   │   │   └── types.ts                   # Client domain models
│   │   ├── identity/                      # User roles, formatting, authorization policies
│   │   │   ├── policies.ts                # Permission logic (Agent vs Team Lead)
│   │   │   └── types.ts                   # User roles & agent definitions
│   │   ├── interaction/                   # Interaction entities, license validation, timestamps
│   │   │   ├── license.ts                 # Unified support license domain model
│   │   │   ├── repository.ts              # Interaction repository interface contract
│   │   │   ├── timestamp.ts               # PHT time resolution & date helpers
│   │   │   └── types.ts                   # Support interaction types, products & taxonomies
│   │   ├── stats/                         # Shift KPI calculations
│   │   │   ├── calculator.ts              # Pure function calculating shift stats & ratios
│   │   │   └── types.ts                   # Stats data model
│   │   └── index.ts                       # Domain barrel export
│   │
│   ├── infrastructure/              # External service implementations & storage adapters
│   │   ├── export/                        # CSV sanitizer & native Excel spreadsheet exporter
│   │   │   ├── csvExporter.ts             # RFC-4180 CSV builder with OWASP formula escaping
│   │   │   └── spreadsheetExporter.ts     # Native .xlsx generator via write-excel-file
│   │   ├── sheets/                        # Google Sheets Apps Script sync adapter
│   │   │   └── googleSheetsSyncAdapter.ts # Validated shortcut and browser write boundary
│   │   ├── storage/                       # LocalStorage repositories & offline sync queue
│   │   │   └── localStorageRepos.ts       # Local cache & offline FIFO queue storage
│   │   ├── supabase/                      # Supabase client, repositories, mappers & audit
│   │   │   ├── auditLogger.ts             # Legacy audit adapter; candidate writes use DB triggers
│   │   │   ├── client.ts                  # Supabase JS client instance & config checks
│   │   │   ├── clientRepo.ts              # Supabase client CRM repository
│   │   │   ├── configRepo.ts              # Cloud dynamic taxonomies repository
│   │   │   ├── interactionRepo.ts         # Supabase interaction CRUD repository
│   │   │   └── mappers.ts                 # snake_case DB to camelCase domain mappers
│   │   └── index.ts                       # Infrastructure barrel export
│   │
│   ├── components/                  # React presentation components
│   │   ├── common/                        # Reusable input controls & primitives
│   │   │   ├── ClassificationSelector.tsx # Searchable category dropdown
│   │   │   ├── ClientAutocompleteInput.tsx# Autocompleting client name input
│   │   │   ├── ConfirmModal.tsx           # Generic confirmation dialog
│   │   │   ├── LicenseSelector.tsx        # Support tier radio buttons
│   │   │   ├── Modal.tsx                  # Base accessible modal wrapper
│   │   │   ├── PhoneNumberField.tsx       # Auto-formatting phone number input
│   │   │   ├── ProductSelector.tsx        # Searchable product / equipment selector
│   │   │   ├── StatusSelector.tsx         # Color-coded status selector
│   │   │   ├── formNavigation.ts          # Keyboard navigation helpers
│   │   │   ├── useClickOutside.ts         # Click-outside hook
│   │   │   ├── useListKeyboardNavigation.ts # Arrow-key list navigation hook
│   │   │   └── index.ts                   # Common components barrel export
│   │   ├── interaction-form/              # Decomposed interaction logging subcomponents
│   │   │   ├── InteractionGeneralFields.tsx # Date, agent, and client autocomplete
│   │   │   ├── InteractionChannelFields.tsx # Channel type & ticket / phone inputs
│   │   │   ├── InteractionProductFields.tsx # Product, classification & status selectors
│   │   │   ├── InteractionContextFields.tsx # License, in-event & first-time flags
│   │   │   ├── InteractionNotesField.tsx    # Additional troubleshooting notes textarea
│   │   │   └── index.ts                   # Interaction form subcomponents barrel
│   │   ├── AppLogo.tsx                    # Generic vector shield + headset SVG emblem
│   │   ├── AuthModal.tsx                  # Authentication & password change gatekeeper dialog
│   │   ├── ClientDirectory.tsx            # Dedicated Client CRM directory view
│   │   ├── ClientFormModal.tsx            # Manual client profile creation & editor modal
│   │   ├── DeleteConfirmModal.tsx         # Safe deletion confirmation modal
│   │   ├── EditInteractionModal.tsx       # In-place interaction editor modal
│   │   ├── InteractionForm.tsx            # Dual-view interaction logging form
│   │   ├── InteractionTable.tsx           # Filterable, sortable, exportable history table
│   │   ├── MarketingFolders.tsx           # Searchable resource folders directory
│   │   ├── Navbar.tsx                     # Top navigation bar with live clock & sync status
│   │   ├── PasteExcelModal.tsx            # Modal for pasting & parsing Excel/Sheets rows
│   │   ├── Sidebar.tsx                    # Collapsible multi-tab navigation sidebar
│   │   ├── StatsCards.tsx                 # Real-time shift summary KPI cards
│   │   └── WorkInProgress.tsx             # Placeholder screen for upcoming operational modules
│   │
│   ├── utils/                       # Date helpers, theme handlers, parsers & security
│   │   ├── channelDetails.ts              # Phone vs Ticket URL/ID validation
│   │   ├── clipboard.ts                   # Safe clipboard reading & writing helpers
│   │   ├── date.ts                        # Date formatting & shift time resolution
│   │   ├── helpdesk.ts                    # Helpdesk ticket URL template interpolation
│   │   ├── importParser.ts                # Tab-separated spreadsheet row parser & validator
│   │   ├── interactionFilters.ts          # Multi-field filtering & search engine
│   │   ├── pagination.ts                  # Client-side pagination logic
│   │   ├── passwordSecurity.ts            # HaveIBeenPwned k-Anonymity password check
│   │   ├── scroll.ts                      # Smooth scroll animator with cubic bezier easing
│   │   ├── storage.ts                     # LocalStorage manager with quota protection
│   │   ├── theme.ts                       # Dark/light theme management
│   │   └── uuid.ts                        # Cryptographic UUID validation & generation
│   │
│   ├── data/
│   │   └── marketingFolders.ts            # Default operational folder catalog
│   ├── types.ts                     # Application-wide TypeScript definitions
│   ├── App.tsx                      # Root application orchestrator
│   └── main.tsx                     # Application entrypoint & DOM mount
│
├── google-sheets-v2-appscript.js    # Google Apps Script Web App source code
├── sql/                             # Local SQL scripts, migrations, and database tests
├── .env.example                     # Environment configuration template
├── .gitignore                       # Git ignore rules (*.sql, .env, etc.)
├── index.html                       # HTML entrypoint with metadata & favicon
├── package.json                     # Dependencies and scripts
├── tailwind.config.js               # Tailwind CSS theme config (primary color tokens)
├── tsconfig.json                    # TypeScript compiler options
├── vercel.json                      # Vercel SPA routing and security headers
└── vite.config.ts                   # Vite bundler configuration
```

---

## 🛠 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/leandersalanguit/support-operations-hub.git
   cd support-operations-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

Create a `.env` file in the project root by copying `.env.example`:

```bash
cp .env.example .env
```

Refer to [`.env.example`](./.env.example) for the public shortcut and browser settings. Set Google Sheets server secrets only in Supabase Edge Function Secrets.

### Development Server

Start the local Vite development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173/`.

### Automated Testing & CI Quality Gate

The project uses [Vitest](https://vitest.dev/) for high-speed unit testing of domain policies, calculators, and sanitizers, alongside GitHub Actions for pull request verification:

```bash
# Run automated unit test suite
npm test

# Run tests in interactive watch mode
npm run test:watch
```

Automated CI quality gates (`.github/workflows/ci.yml`) enforce:
1. **Lint & Type Check** (`npx tsc --noEmit`)
2. **Unit Tests** (`npm test`)
3. **Build & Asset Verification** (`npm run build`)

### Production Build & Verification

Type-check and compile the production bundle:

```bash
# Verify TypeScript types without emitting code
npx tsc --noEmit

# Compile production bundle to /dist
npm run build

# Preview production build locally
npm run preview
```

---

## 🗄 Database Setup & Supabase Schema

The app uses Supabase Auth, PostgreSQL, and Realtime. Manual SQL scripts and database tests are in the ignored `sql/` folder. Create an account in Supabase Dashboard under Authentication > Users, then run `sql/add-user.sql` for a support agent or `sql/add-team-lead.sql` for a team lead. Replace the user ID and email placeholders first. These scripts assign app access in `private.staff_access`; they do not create Auth accounts or set passwords.

The reviewed migrations are in the standard `supabase/migrations/` path and are discovered by Supabase CLI. Database SQL tests and fixtures are preserved under `sql/supabase/tests/`.

### Local database verification

Install Docker and Node.js 22. Start the Docker engine. Use a local test stack with synthetic data:

```bash
npm ci --ignore-scripts
npm run db:start
npm run db:reset
npm run test:db
npm run test:db:legacy
npm run db:stop
```

`test:db:legacy` resets the local test database, loads the old example schema, applies the additive baseline and security controls, and checks data preservation. It refuses to run unless `SUPPORT_HUB_ISOLATED_DB_TEST=1` is set. Set that variable only after you confirm that this is a disposable local test stack. CI sets it in its isolated runner. Both database suites must pass. Do not use these reset commands with local records that you need to keep.

### Security release order

This branch is a release candidate. It does not establish production approval or SOC 2 compliance.

1. Export and compare the actual schema. The baseline is a local reconstruction. Back up the data and verify a restore before a live migration.
2. Reconcile old browser queues with the data owner. Do not assign unowned work to the next user. Delete legacy keys only after recovery or approved discard.
3. Apply the reviewed schema and access controls in staging. Provision named staff in `private.staff_access` through trusted administration. Unknown staff have no business access. Do not infer historical owner UUIDs from names.
4. Deploy `complete-password-change`. The function requires the server runtime Supabase credentials and an exact `SUPPORT_HUB_ALLOWED_ORIGINS` allowlist. Never place the service key in a `VITE_*` variable. Disable public registration.
5. Verify the interaction audit trigger before deploying the app. Browser interaction audit writes have been removed. The app must not run against a database without the trigger.
6. Run direct API and authenticated browser tests. Verify deactivation, session expiry, recovery, all open tabs, backups, headers, CSP, MFA, and incident alerts on the selected host.
7. Require successful quality checks and reviews for the release commit. The Pages workflow includes the database gate. Configure equivalent protection for any other deployment path.
8. Obtain named business, data, and security owner approval before a pilot with customer records.

Customer caches and pending operations use tab session storage with a project and user scope. Cache lifetime is 30 minutes. Work older than 8 hours requires review. Voluntary logout offers retry, cancel, or explicit discard when work is pending. Automatic session loss can remove unsent work. The old unscoped keys remain for approved reconciliation and are never replayed by this app.

Keep restrictive database access and audit controls during rollback. Do not restore permissive policies to make an old app work.

---

## 📊 Google Sheets Pilot Status

The master-sheet shortcut is public. Sync remains disabled until the server secrets, writer deployment, restricted Google sharing, and Supabase Cron job are configured. The reference Apps Script requires a token in the JSON request body. It rejects the old URL-token request. Disable an old deployed endpoint and rotate its old token before deployment.

---

## 🔒 Security & Threat Mitigation

| Security Feature | Implementation | Threat Addressed |
| :--- | :--- | :--- |
| **Breach Verification** | HaveIBeenPwned k-Anonymity API (`passwordSecurity.ts`) | Prevents agents from reusing breached passwords; only first 5 chars of SHA-1 hash sent. |
| **Spreadsheet Text Safety** | Formula prefixes are neutralized in CSV and clipboard output; XLSX cells use string types. | Keeps untrusted text literal in supported exports. |
| **Agent Identity Locking** | Supabase Auth session identity binding | Prevents agents from submitting logs under other agents' identities. |
| **Interaction Audit** | Transactional `interaction_audit_events` trigger | Records committed interaction changes with actor UUIDs and reviewed snapshots; legacy audit rows remain restricted history. |
| **HTTP Security Headers** | Configured in `vercel.json` | Enforces `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and strict `Referrer-Policy`. |

---

## 📄 License & Commercial Licensing

### Open Source License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See the [LICENSE](./LICENSE) file for complete details.

### Commercial Licensing & Proprietary Deployments

The AGPL-3.0 requires derivative works and networked deployments to remain open source under the same license. If your organization requires:

- **Commercial / Closed-Source Waiver**: Permission to use, modify, or embed this software in proprietary environments without copyleft obligations or source disclosure.
- **Custom Integrations**: Tailored CRM, telephony, and ticketing pipeline adapters.
- **White-Labeling**: Branded deployments customized with your corporate design system and domains.
- **Managed Cloud**: Turnkey deployments with automated backups and maintenance.

Please get in touch with me (or open an inquiry via GitHub Discussions) to discuss custom licensing agreements.
