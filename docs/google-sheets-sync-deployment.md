# Google Sheets sync deployment

Do not enable the browser flag until every step in this guide is complete. Supabase remains the canonical store. The worker sends committed interaction snapshots in one direction to the master sheet.

## Prepare the master sheet

Use the approved master URL in `VITE_GOOGLE_SHEETS_URL`. Keep Google sharing restricted to the approved domain emails with View access. Do not grant editor access to viewers.

Create a Google Apps Script project. Copy `scripts/reference/google-sheets-v2-appscript.js` into it. Deploy a web app that runs as the approved writer account. The writer account must have edit access to the master sheet. Set the web app access to `Anyone` so the server worker can make a noninteractive request. The JSON body token authorizes each request. Use the deployed `/exec` URL as `GOOGLE_SHEETS_WEBAPP_URL`.

Set these Script Properties:

- `MASTER_SPREADSHEET_ID`: `1fcChOwOccK8txqtFNDIa6JxA79l9nrHm1juXLQHBK_k`.
- `SECRET_TOKEN`: a random 32-byte hex value.

Do not put the token in the script source, browser environment, sheet URL, query string, or logs. The deployed endpoint must reject requests without this value in the JSON body. The script opens the configured spreadsheet by ID and stops if either property is missing.

Disable and remove any previous public deployment that accepted a token in its URL. Rotate every token that was used by the old endpoint. Do not reuse an old token.

## Set Edge Function secrets

Set these in Supabase Edge Function Secrets. Do not use `VITE_` names:

- `GOOGLE_SHEETS_WEBAPP_URL`: the deployed Apps Script `/exec` URL.
- `GOOGLE_SHEETS_SECRET_TOKEN`: the same random 32-byte hex value stored in Script Properties.
- `GOOGLE_SHEETS_WORKER_SECRET`: a separate random secret with at least 32 characters.

The function also uses the Supabase runtime URL and service role key. Never copy its service role key to the browser or this repository.

## Set Vault values and the scheduled worker

Apply the database migrations and deploy the `google-sheets-sync` Edge Function first. Enable Supabase Cron and `pg_net` if the project does not already have them.

The migration does not backfill existing interactions. Only inserts, updates, and deletes after the migration are queued. An initial data transfer is not required to sync new changes. Do not perform an initial data transfer without separate approval.

In the Supabase SQL Editor, add the project URL, project publishable key, and the exact worker secret to Vault. Use the actual values only in the secure dashboard:

```sql
select vault.create_secret('<SUPABASE_PROJECT_URL>', 'google_sheets_project_url');
select vault.create_secret('<SUPABASE_PUBLISHABLE_KEY>', 'google_sheets_publishable_key');
select vault.create_secret('<GOOGLE_SHEETS_WORKER_SECRET>', 'google_sheets_worker_secret');
```

Schedule one worker call per minute. The worker secret is read from Vault when the job runs. It is not stored in the cron command text.

```sql
select cron.schedule(
  'google-sheets-sync-worker',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret
              from vault.decrypted_secrets
              where name = 'google_sheets_project_url') || '/functions/v1/google-sheets-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret
                  from vault.decrypted_secrets
                  where name = 'google_sheets_publishable_key'),
        'x-worker-secret', (select decrypted_secret
                            from vault.decrypted_secrets
                            where name = 'google_sheets_worker_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    ) as request_id;
  $$
);
```

Before scheduling it again, remove the old job by name:

```sql
select cron.unschedule(jobid)
from cron.job
where jobname = 'google-sheets-sync-worker';
```

Check the job history in Supabase Cron. The Edge Function claims at most five events per request. It retries failed events with increasing delay. A three-minute lease lets a later worker reclaim work after a stopped request.

## Enable the browser status

Set `VITE_GOOGLE_SHEETS_SYNC_ENABLED=true` only after the function secrets, the Apps Script property, the restricted sharing, and the Cron job are ready. Rebuild the browser app after changing the public flag.

`VITE_GOOGLE_SHEETS_URL` controls only the master-sheet shortcut. The browser never sends interaction data to Google. It reads pending and failed counts through the scoped `get_google_sheets_sync_status` RPC.

## Disable the integration

Set the browser flag to `false`, stop the Cron job, and remove the Apps Script deployment. Keep Supabase data and any pending outbox rows. Do not remove the database tables until the queue is empty and the migration has been reviewed.

## References

- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Schedule Edge Functions with pg_cron and Vault](https://supabase.com/docs/guides/functions/schedule-functions)
- [Supabase Cron quickstart](https://supabase.com/docs/guides/cron/quickstart)
