import Constants from 'expo-constants';

function required(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (
    !normalized ||
    /your[-_ ]?project|placeholder|example\.com/i.test(normalized) ||
    /^YOUR[-_]/i.test(normalized)
  ) {
    throw new Error(
      `Missing or placeholder ${name}. Copy .env.example to .env.local, add the live value, then restart with \`npx expo start --clear\`.`
    );
  }
  return normalized;
}

/**
 * Runtime config. Only publishable values live here — the Supabase publishable
 * key and the WorkOS client id are both browser-safe by design. RLS and the
 * WorkOS session are what actually protect the data.
 */
export const env = {
  get supabaseUrl() {
    return required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return required('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  },
  get workosClientId() {
    return required('EXPO_PUBLIC_WORKOS_CLIENT_ID', process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID);
  },
  /** AuthKit domain, e.g. https://auth.foodlineai.com or the WorkOS-hosted one. */
  get workosAuthDomain() {
    return process.env.EXPO_PUBLIC_WORKOS_AUTH_DOMAIN ?? 'https://api.workos.com';
  },
  /** WorkOS-registered HTTPS callback. The ERP forwards mobile states to the app scheme. */
  get workosRedirectUri() {
    return (
      process.env.EXPO_PUBLIC_WORKOS_REDIRECT_URI ?? 'https://erp.foodlineai.com/api/auth/callback'
    ).replace(/\/+$/, '');
  },
  /**
   * The ERP that hosts the governed Copilot (`POST /api/mobile/copilot`).
   * The model key never ships in the app — this is the only AI setting it
   * needs. Defaults to production; requests still need a valid WorkOS token.
   */
  get erpBaseUrl() {
    return (process.env.EXPO_PUBLIC_ERP_BASE_URL ?? 'https://erp.foodlineai.com').replace(/\/+$/, '');
  },
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as 'development' | 'staging' | 'production',
  version: Constants.expoConfig?.version ?? '0.0.0',
} as const;
