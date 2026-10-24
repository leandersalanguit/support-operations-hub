# Google Sheets sync execution ledger

- Start: 2026-10-24.
- Branch observed: `codex/security-remediation`.
- Worktree: existing shared checkout; preserve all pre-existing user changes.
- Production changes: none authorized or made.
- Live Google Sheet writes: none authorized or made.
- Current step: local implementation complete; graph refresh is pending with the root coordinator.
- Worker policy: Supabase Cron calls the Edge Function every minute. A three-minute lease supports stale-worker recovery.
- Identity policy: the trigger assigns monotonically increasing versions per interaction ID. A committed event remains valid if its actor later leaves the staff list.
- Status policy: active staff see their own aggregate counts. Team Leads see global aggregate counts.
- Files changed by this task: migration, database test, Edge Function, shared sync handler, browser URL helper, bundle scan, docs, `.env.example`, `.gitignore`, README, `package.json`, and the legacy Apps Script reference/tests.
- Verification: full Vitest suite passed 185/185 with one worker; typecheck passed; production build passed; browser bundle scan passed for five assets.
- Test note: parallel Vitest workers produced two failures in the dirty client cache tests; the serial full suite passed those tests without changes to the user-owned hook or tests.
- Database test: not executed. The Supabase CLI is absent, the Docker Desktop Linux engine is not running, and the `npx` CLI attempt waited over 60 seconds without output. No local database reset was attempted.
- Production changes: none.
- Live Google Sheet writes: none.
- Configuration still needed: set Apps Script `MASTER_SPREADSHEET_ID` and `SECRET_TOKEN` properties, deploy as the approved writer with noninteractive `Anyone` access, set the Edge Function URL/token/worker secrets, create the Vault values and Cron job, keep domain sharing View only, and set `VITE_GOOGLE_SHEETS_SYNC_ENABLED=true` only after setup.
- Initial transfer: not part of this sync. Existing rows are not backfilled.
