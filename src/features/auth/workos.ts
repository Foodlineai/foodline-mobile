import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { env } from '@/lib/env';
import { secureStorage } from '@/lib/secure-storage';

/**
 * WorkOS AuthKit, PKCE, native.
 *
 * WorkOS owns the session. Supabase never issues a token here — it receives the
 * WorkOS access token as a third-party JWT, exactly as the web ERP does in
 * `src/integrations/supabase/application-scope.server.ts`. Keep the two in step.
 */

const TOKEN_KEY = 'foodline.workos.tokens';

type StoredTokens = {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch ms. */
  expiresAt: number;
};

const discovery: AuthSession.DiscoveryDocument = {
  tokenEndpoint: `${env.workosAuthDomain}/user_management/authenticate`,
};

type DeviceAuthorization = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
};

type DeviceTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

type WorkOSError = {
  error?: string;
  error_description?: string;
};

let cached: StoredTokens | null = null;

async function persist(tokens: StoredTokens | null): Promise<void> {
  cached = tokens;
  if (tokens === null) await secureStorage.removeItem(TOKEN_KEY);
  else await secureStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

async function load(): Promise<StoredTokens | null> {
  if (cached) return cached;
  const raw = await secureStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    cached = JSON.parse(raw) as StoredTokens;
    return cached;
  } catch {
    await persist(null);
    return null;
  }
}

function formBody(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

async function requestDeviceAuthorization(): Promise<DeviceAuthorization> {
  const response = await fetch(`${env.workosAuthDomain}/user_management/authorize/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({ client_id: env.workosClientId }),
  });
  const result = (await response.json()) as DeviceAuthorization & WorkOSError;
  if (!response.ok || !result.device_code || !result.verification_uri_complete) {
    throw new Error(result.error_description ?? 'Unable to start secure sign-in');
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollForTokens(authorization: DeviceAuthorization): Promise<DeviceTokenResponse> {
  const deadline = Date.now() + authorization.expires_in * 1000;
  let intervalMs = Math.max(authorization.interval, 1) * 1000;

  while (Date.now() < deadline) {
    await sleep(intervalMs);
    const response = await fetch(`${env.workosAuthDomain}/user_management/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: authorization.device_code,
        client_id: env.workosClientId,
      }),
    });
    const result = (await response.json()) as DeviceTokenResponse & WorkOSError;

    if (response.ok && result.access_token) return result;
    if (result.error === 'authorization_pending') continue;
    if (result.error === 'slow_down') {
      intervalMs += 1000;
      continue;
    }
    if (result.error === 'access_denied') throw new Error('Sign-in was denied');
    if (result.error === 'expired_token') throw new Error('Sign-in timed out. Please try again.');
    throw new Error(result.error_description ?? 'Unable to complete secure sign-in');
  }

  throw new Error('Sign-in timed out. Please try again.');
}

/** Starts WorkOS's native/public-client Device Authorization flow. */
export async function signIn(): Promise<void> {
  const authorization = await requestDeviceAuthorization();
  const browser = WebBrowser.openBrowserAsync(authorization.verification_uri_complete);

  let token: DeviceTokenResponse;
  try {
    token = await pollForTokens(authorization);
    WebBrowser.dismissBrowser();
  } finally {
    void browser.catch(() => undefined);
  }

  await persist({
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  });
}

export async function signOut(): Promise<void> {
  await persist(null);
}

/**
 * Returns a valid access token, refreshing when it is close to expiry.
 * This is what gets handed to the Supabase client on every request.
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = await load();
  if (!tokens) return null;

  const stillFresh = tokens.expiresAt - Date.now() > 60_000;
  if (stillFresh) return tokens.accessToken;

  if (!tokens.refreshToken) {
    await persist(null);
    return null;
  }

  try {
    const refreshed = await AuthSession.refreshAsync(
      { clientId: env.workosClientId, refreshToken: tokens.refreshToken },
      discovery
    );
    await persist({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
      expiresAt: Date.now() + (refreshed.expiresIn ?? 3600) * 1000,
    });
    return refreshed.accessToken;
  } catch {
    await persist(null);
    return null;
  }
}

export async function hasStoredSession(): Promise<boolean> {
  return (await load()) !== null;
}

/**
 * The raw refresh token, for biometrics.ts to place behind
 * `requireAuthentication: true` — see that file's own header for why only
 * the refresh token, never the access token, is protected this way.
 */
export async function getRefreshToken(): Promise<string | null> {
  const tokens = await load();
  return tokens?.refreshToken ?? null;
}
