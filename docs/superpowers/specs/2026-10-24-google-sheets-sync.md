# Google Sheets sync

## Purpose

Restore the master Google Sheet shortcut. Send committed interaction changes from the application to Google Sheets.

## Requirements

- Supabase SHALL remain the canonical store for interaction data.
- The migration SHALL sync only changes that occur after the migration is deployed. It SHALL NOT copy existing interactions to the sheet.
- The browser SHALL NOT send interaction data to Google.
- The browser SHALL NOT contain the Apps Script token or a server credential.
- The browser SHALL open a master sheet URL only when the URL uses HTTPS and the `docs.google.com/spreadsheets/` path.
- PostgreSQL SHALL add one outbox event in the same transaction as each committed interaction insert, update, or delete.
- The outbox SHALL contain only the approved interaction fields that the master sheet uses.
- The sync worker SHALL accept requests only with a configured worker secret.
- A scheduled server job SHALL run every minute. The browser SHALL NOT run or schedule the worker.
- A worker lease SHALL expire after three minutes. A later worker SHALL reclaim an expired lease.
- A worker SHALL process no more than five events per request. It SHALL use a unique lease ID when it claims each event.
- A late worker SHALL NOT mark an event complete after another worker reclaims it.
- The sync worker SHALL use a server-side token in the request body. It SHALL NOT put the token in a URL or log.
- The database SHALL allow only the service role to claim or change outbox work.
- Active staff SHALL see pending or failed counts for their own changes. Team Leads SHALL see global counts.
- A worker SHALL process a committed event even if its actor later leaves the staff list.
- A trusted database or service write with no actor SHALL still create an outbox event.
- The worker SHALL retry temporary failures. A repeated or old event SHALL NOT replace a newer event.
- A delete event SHALL leave a version tombstone. An old event SHALL NOT restore a deleted row.
- An update that changes the interaction month SHALL remove the old row and add the new row.
- The Apps Script SHALL create monthly tabs when needed.
- The Apps Script SHALL write untrusted text as literal text.
- The deployment guide SHALL describe token setup, sheet sharing, cron setup, and removal of the old public endpoint.
- No production setting SHALL be changed. No live sheet write SHALL be made in this task.

## Interface

- `POST /functions/v1/google-sheets-sync` accepts only a worker secret.
- The worker reads a private outbox. It sends `{token, event}` as JSON to the configured Apps Script URL.
- `GET` is not supported. The status RPC returns aggregate counts to active staff.
- `VITE_GOOGLE_SHEETS_URL` is a public shortcut setting. Server settings are `GOOGLE_SHEETS_WEBAPP_URL`, `GOOGLE_SHEETS_SECRET_TOKEN`, and `GOOGLE_SHEETS_WORKER_SECRET`.

## Security limits

- Existing Supabase row security remains the authorization control for interaction writes.
- The queue uses the actor ID from the database session. It does not accept an actor ID from the browser.
- The worker status query filters by the authenticated actor ID.
- The Apps Script secret is stored in Script Properties.
- The old URL token endpoint SHALL be disabled before a real deployment.
- A deployment SHALL wait for approved secrets, the validated master sheet URL, and restricted Google sharing.
- A scheduled worker SHALL use Supabase Cron, `pg_net`, and Vault. It SHALL not store the worker secret in a cron command.
