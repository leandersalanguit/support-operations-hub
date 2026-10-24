# Google Sheets sync implementation plan

**Goal:** Sync committed interaction changes to Google Sheets through a private server queue.

**Architecture:** A Postgres trigger writes an allowlisted event to a private outbox. Supabase Cron calls a Supabase Edge Function every minute. The function reclaims expired leases and processes up to five events. It sends a body token to Apps Script. Apps Script stores the highest version for each interaction.

**Tech Stack:** React, TypeScript, Supabase Postgres, Supabase Edge Functions, Google Apps Script, Vitest, pgTAP.

**Spec:** `docs/superpowers/specs/2026-10-24-google-sheets-sync.md`

## Global constraints

- Supabase remains the canonical store.
- The browser does not send interaction data to Google.
- The browser does not contain the Apps Script token or a server credential.
- The request token is in the JSON body. It is not in a URL or log.
- Only the Supabase service role can claim or update outbox events.
- The worker processes committed events even if the actor later leaves the staff list.
- Active staff see their own counts. Team Leads see global counts.
- Existing interactions are not backfilled. Only future committed changes enter the outbox.
- No production setting changes and no live sheet writes.
- Existing user changes in the worktree remain in place.

## Review focus

- An unauthorized user cannot read another actor's sync status or claim work.
- An invalid URL, token, event, or date cannot reach a sheet operation.
- Duplicate and old events do not duplicate a row or replace a newer row.
- A retry after a partial month move completes the move safely.
- Formula-like text stays literal in Google Sheets.

## Tasks

### Task 1: Database outbox

**Files:** Create one migration and one pgTAP test file.

- [x] Add a private table with one monotonic version per interaction ID.
- [x] Add a private outbox. Add a trigger for insert, update, and delete.
- [x] Add service-role-only claim, success, and retry functions. Add a three-minute lease and stale lease reclaim.
- [x] Add an active-staff status function. Return own counts, or global counts to Team Leads.
- [x] Author pgTAP cases for insert, update, delete, retry, stale lease, and forbidden access.
- [ ] Run the pgTAP tests. The local Supabase CLI and Docker engine are unavailable.

### Task 2: Edge worker

**Files:** Create `supabase/functions/google-sheets-sync/index.ts`, `handler.ts`, and handler tests. Update `supabase/config.toml`.

- [x] Validate method, body size, worker secret, and Apps Script URL.
- [x] Claim due work with the service role. Send an allowlisted event with a body token.
- [x] Set bounded timeouts and exponential retries. Do not log secrets or payloads.
- [x] Test rejection, successful insert/update/delete, retry, and idempotency behavior.

### Task 3: Apps Script

**Files:** Update the reference script and add a Node VM test harness.

- [x] Read the token from Script Properties and reject invalid requests before sheet access.
- [x] Use a lock. Store versions and delete tombstones in a hidden state tab.
- [x] Upsert each interaction by ID. Move it when its month changes.
- [x] Create monthly tabs and neutralize formula-like text.
- [x] Test authentication, duplicate events, old events, month moves, deletes, formula text, and lock contention.

### Task 4: Browser status and shortcut

**Files:** Update the Sheets adapter, add a status hook, update `Navbar`, `App.tsx`, `.env.example`, and tests.

- [x] Validate the public Sheets shortcut URL before displaying it.
- [x] Read the caller's pending and failed counts from Supabase.
- [x] Show pending or failed status. Keep demo mode separate.
- [x] Scan the production bundle for server setting names and token values.

### Task 5: Deployment guide and verification

**Files:** Update README and add a deployment guide with executable cron and Vault setup SQL.

- [x] Document environment settings, restricted sharing, token rotation, Cron, and old endpoint shutdown.
- [x] State that sync is disabled until server settings and the scheduled worker are configured.
- [x] Run the full Vitest suite, typecheck, build, and bundle secret scan.
- [ ] Run `graphify update .` after the final file changes. The root coordinator owns this single update.

## Completion record

- Tests run: `rtk npm run test -- --pool=threads --maxWorkers=1` passed 185/185; `rtk npm run typecheck` passed; `rtk npm run build` passed; `rtk npm run check:sheet-bundle` passed for five assets.
- Database test: not run. The Supabase CLI is unavailable and the Docker Desktop Linux engine is not running.
- Deployment settings required: Apps Script spreadsheet ID and token, Apps Script web app URL, Edge Function token and worker secret, Vault values, Cron job, restricted Google sharing, and `VITE_GOOGLE_SHEETS_SYNC_ENABLED=true` after setup.
- Initial transfer: not required for future sync. Existing interactions are not backfilled.
- Production changes: none.
- Live sheet writes: none.
