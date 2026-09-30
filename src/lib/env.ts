import Constants from 'expo-constants';

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in, then restart with \`npx expo start --clear\`.`
    );
  }
  return value;
}

export const isDemoMode = process.env.EXPO_PUBLIC_DEMO_MODE === '1';

/**
 * Runtime config. Only publishable values live here — the Supabase publishable
 * key and the WorkOS client id are both browser-safe by design. RLS and the
 * WorkOS session are what actually protect the data.
 *
 * In demo mode nothing is required, so the app boots on a fresh clone.
 */
export const env = {
  get supabaseUrl() {
    return isDemoMode
      ? 'https://demo.invalid'
      : required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return isDemoMode
      ? 'demo'
      : required('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  },
  get workosClientId() {
    return isDemoMode
      ? 'demo'
      : required('EXPO_PUBLIC_WORKOS_CLIENT_ID', process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID);
  },
  get erpBaseUrl() {
    return (process.env.EXPO_PUBLIC_ERP_BASE_URL ?? 'https://erp.foodlineai.com').replace(/\/$/, '');
  },
  /** AuthKit domain, e.g. https://auth.foodlineai.com or the WorkOS-hosted one. */
  get workosAuthDomain() {
    return process.env.EXPO_PUBLIC_WORKOS_AUTH_DOMAIN ?? 'https://api.workos.com';
  },
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as 'development' | 'staging' | 'production',
  version: Constants.expoConfig?.version ?? '0.0.0',
} as const;
