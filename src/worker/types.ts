export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  RATE_LIMIT_KV?: KVNamespace;
  DEMO_MODE: string;
  ALLOWED_EMAIL_DOMAINS: string;
  TIMEZONE: string;
  GIT_COMMIT?: string;
  APP_VERSION?: string;
}
