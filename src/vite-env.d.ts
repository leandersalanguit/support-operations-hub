/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_GOOGLE_SHEETS_URL?: string;
  readonly VITE_GOOGLE_SHEETS_WEBAPP_URL?: string;
  readonly VITE_HELPDESK_TICKET_URL?: string;
  readonly VITE_HELPDESK_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
