import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
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
  authorizationEndpoint: `${env.workosAuthDomain}/user_management/authorize`,
  tokenEndpoint: `${env.workosAuthDomain}/user_management/authenticate`,
};

export const nativeRedirectUri = AuthSession.makeRedirectUri({
  scheme: 'foodline',
  path: 'auth/callback',
});

const MOBILE_STATE_PREFIX = 'foodline-mobile:';

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

/** Starts WorkOS AuthKit with PKCE and returns directly to the native app. */
export async function signIn(): Promise<void> {
  const request = new AuthSession.AuthRequest({
    clientId: env.workosClientId,
    redirectUri: env.workosRedirectUri,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
    state: `${MOBILE_STATE_PREFIX}${Crypto.randomUUID()}`,
    extraParams: {
      provider: 'authkit',
      screen_hint: 'sign-in',
    },
  });

  const authorizationUrl = await request.makeAuthUrlAsync(discovery);
  const browserResult = await WebBrowser.openAuthSessionAsync(authorizationUrl, nativeRedirectUri);
  const result = browserResult.type === 'success' ? request.parseReturnUrl(browserResult.url) : browserResult;
  if (result.type !== 'success' || !result.params.code) {
    throw new Error(result.type === 'cancel' ? 'Sign-in cancelled' : 'Sign-in failed');
  }

  const token = await AuthSession.exchangeCodeAsync(
    {
      clientId: env.workosClientId,
      code: result.params.code,
      redirectUri: env.workosRedirectUri,
      extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
    },
    discovery
  );

  await persist({
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? null,
    expiresAt: Date.now() + (token.expiresIn ?? 3600) * 1000,
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
