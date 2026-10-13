/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH_BASE_URL?: string;
  readonly VITE_API_SECRET?: string;
  readonly VITE_CLIENT_ID?: string;
  readonly VITE_CLIENT_SECRET?: string;
  readonly VITE_TELEGRAM_BOT_USERNAME?: string;
  readonly VITE_ENABLE_MOCK_DATA?: string;
  readonly VITE_USE_MOCK_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
