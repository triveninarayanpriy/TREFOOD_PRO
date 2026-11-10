export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  SESSION_KV?: KVNamespace;
  RATE_LIMIT_KV?: KVNamespace;
  DEMO_MODE: string;
  ALLOWED_EMAIL_DOMAINS: string;
  TIMEZONE: string;
  TURNSTILE_ENABLED?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  GIT_COMMIT?: string;
  APP_VERSION?: string;
}
