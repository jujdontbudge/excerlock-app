import type { EnvironmentValues } from './environment';
export type VendorCheck = { service: string; status: 'ok' | 'missing' | 'failing'; detail: string };
export type Probe = (url: string, init?: RequestInit) => Promise<{ status: number }>;

/** Cheap service probes, not proof of sign-in, purchases, event ingestion or device activation. */
export async function checkVendors(env: EnvironmentValues, probe: Probe): Promise<VendorCheck[]> {
  const checks: { service: string; keys: string[]; url: () => string; init?: () => RequestInit; accepted?: number[]; detail: string }[] = [
    { service: 'Supabase', keys: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'], url: () => `${env.EXPO_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')}/auth/v1/settings`, init: () => ({ headers: { apikey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY! } }), detail: 'Auth settings reachable with public key; real auth still requires device test' },
    { service: 'API', keys: ['EXPO_PUBLIC_API_URL'], url: () => `${env.EXPO_PUBLIC_API_URL!.replace(/\/$/, '')}/v1/health`, detail: 'Health route reachable; authenticated routes are separate checks' },
    { service: 'PostHog', keys: ['EXPO_PUBLIC_POSTHOG_HOST', 'EXPO_PUBLIC_POSTHOG_KEY'], url: () => `${env.EXPO_PUBLIC_POSTHOG_HOST!.replace(/\/$/, '')}/decide/?v=3`, init: () => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: env.EXPO_PUBLIC_POSTHOG_KEY, distinct_id: 'excerlock-env-doctor' }) }), detail: 'Decide endpoint accepted request; SDK ingestion still requires verification' },
    { service: 'Sentry', keys: ['SENTRY_AUTH_TOKEN', 'SENTRY_DSN'], url: () => 'https://sentry.io/api/0/', init: () => ({ headers: { Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}` } }), detail: 'Token authenticated; project upload scopes and DSN ingestion are separate checks' },
    { service: 'Adapty', keys: ['ADAPTY_SECRET_KEY', 'EXPO_PUBLIC_ADAPTY_KEY'], url: () => 'https://api.adapty.io/api/v2/server-side-api/profile/', init: () => ({ headers: { Authorization: `Api-Key ${env.ADAPTY_SECRET_KEY}`, 'adapty-profile-id': '00000000-0000-0000-0000-000000000000' } }), accepted: [200, 404], detail: 'Server credential probe accepted; public SDK key and StoreKit require device purchase tests' },
    { service: 'Google', keys: ['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'], url: () => 'https://accounts.google.com/.well-known/openid-configuration', detail: 'OIDC discovery reachable and client ID present; configured client sign-in remains a device gate' },
  ];
  return Promise.all(checks.map(async (check): Promise<VendorCheck> => {
    const missing = check.keys.filter((key) => !env[key]?.trim());
    if (missing.length) return { service: check.service, status: 'missing', detail: `Missing ${missing.join(', ')}` };
    try {
      const response = await probe(check.url(), check.init?.());
      const ok = check.accepted ? check.accepted.includes(response.status) : response.status >= 200 && response.status < 300;
      return { service: check.service, status: ok ? 'ok' : 'failing', detail: ok ? check.detail : `Probe rejected: HTTP ${response.status}` };
    } catch {
      return { service: check.service, status: 'failing', detail: 'Probe failed or timed out; response and credentials withheld' };
    }
  }));
}
