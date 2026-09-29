import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * Biometric unlock.
 *
 * ═══ What this is, and what it is not ═══
 *
 * Biometrics authenticate **the person holding the device**, not the identity of
 * the account. Face ID says "the enrolled face is present". It does not say
 * "Mehul is present" — if two faces are enrolled on a handset, either one opens
 * it. On a warehouse device passed between shifts, that is a real exposure, not
 * a theoretical one.
 *
 * So the model here is deliberately narrow:
 *
 *   Biometrics unlock a **retained refresh token** on a device the actor has
 *   personally opted in on. They never replace sign-in, never bypass WorkOS,
 *   and are off by default.
 *
 * ═══ Why the OS holds the gate, not us ═══
 *
 * The obvious implementation — call `authenticateAsync()`, and if it resolves,
 * read the token — is wrong. It puts the decision in JavaScript, where the token
 * sits in SecureStore readable regardless, and a bypass is a patched bundle away.
 *
 * Instead the refresh token is written with `requireAuthentication: true`, which
 * binds the keychain/keystore item itself to biometric presence. The OS refuses
 * the read without it. Two things fall out for free, and both are hard to build:
 *
 *   1. **Enrollment changes invalidate the item.** Someone adding their face to
 *      a colleague's handset cannot then unlock that colleague's session — iOS
 *      and Android both drop the item when the biometric set changes. Rolling
 *      this by hand requires `LAPolicyDomainState`, which Expo does not surface.
 *   2. Device passcode is the OS-level fallback, already localised, already
 *      accessible, already handling lockout after failed attempts.
 *
 * ═══ The chunking interaction — read this before changing storage ═══
 *
 * SecureStore caps values at 2 KB, so the long access JWT is stored chunked.
 * Marking every chunk `requireAuthentication` would prompt **per chunk**, which
 * on a five-chunk token is five Face ID prompts in a row.
 *
 * Therefore: only the **refresh token** is biometric-protected. It is short, it
 * fits in one item, and it is the thing worth protecting — an access token
 * expires on its own; a refresh token is the standing key to the session.
 */

const REFRESH_KEY = 'foodline.refresh';
const OPT_IN_KEY = 'foodline.biometric.optin';

export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'passcode' | 'none';

export type BiometricCapability = {
  /** Hardware present and usable. */
  available: boolean;
  /** Something is actually enrolled. Hardware without enrollment is useless. */
  enrolled: boolean;
  kind: BiometricKind;
  /** For UI copy: "Face ID", "Fingerprint", "Device PIN". */
  label: string;
};

export async function getCapability(): Promise<BiometricCapability> {
  const [hasHardware, isEnrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  const kind: BiometricKind = types.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  )
    ? 'face'
    : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ? 'fingerprint'
      : types.includes(LocalAuthentication.AuthenticationType.IRIS)
        ? 'iris'
        : hasHardware
          ? 'passcode'
          : 'none';

  const label =
    kind === 'face'
      ? 'Face ID'
      : kind === 'fingerprint'
        ? 'Fingerprint'
        : kind === 'iris'
          ? 'Iris'
          : kind === 'passcode'
            ? 'Device PIN'
            : 'Not available';

  return { available: hasHardware, enrolled: isEnrolled, kind, label };
}

/**
 * Turn it on. Requires a fresh biometric check first — otherwise anyone holding
 * an already-unlocked phone could enable it and retain access afterwards.
 */
export async function enableUnlock(refreshToken: string): Promise<boolean> {
  const ok = await verifyPresence('Confirm it is you to enable quick sign-in');
  if (!ok) return false;

  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken, {
    requireAuthentication: true,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    authenticationPrompt: 'Unlock Foodline AI',
  });
  await SecureStore.setItemAsync(OPT_IN_KEY, 'true');
  return true;
}

export async function disableUnlock(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(OPT_IN_KEY).catch(() => undefined);
}

export async function isEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(OPT_IN_KEY)) === 'true';
  } catch {
    return false;
  }
}

export type UnlockResult =
  | { ok: true; refreshToken: string }
  | { ok: false; reason: 'cancelled' | 'invalidated' | 'unavailable' };

/**
 * Read the protected token. The OS prompts; we never see a decision to trust.
 *
 * `invalidated` means the biometric set changed — a new face or finger was
 * enrolled — and the OS dropped the item. That is the security property working,
 * not a bug. The actor signs in again and may re-enable.
 */
export async function unlock(): Promise<UnlockResult> {
  if (!(await isEnabled())) return { ok: false, reason: 'unavailable' };

  try {
    const token = await SecureStore.getItemAsync(REFRESH_KEY, {
      requireAuthentication: true,
      authenticationPrompt: 'Unlock Foodline AI',
    });

    if (!token) {
      await disableUnlock();
      return { ok: false, reason: 'invalidated' };
    }
    return { ok: true, refreshToken: token };
  } catch {
    // Distinguishing a cancel from an invalidation is not reliable across
    // platforms, so treat it as a cancel and let a retry surface the truth —
    // a real invalidation returns null on the next attempt.
    return { ok: false, reason: 'cancelled' };
  }
}

/** A presence check with no secret attached. Used before enabling. */
async function verifyPresence(prompt: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    // Device passcode stays available: a selector with wet or gloved hands still
    // needs to get in, and refusing the fallback just means they stop using it.
    disableDeviceFallback: false,
    cancelLabel: 'Cancel',
  });
  return result.success;
}

/**
 * Shared-device guidance, surfaced in the UI rather than buried here.
 *
 * There is no reliable way to detect a shared handset, so we ask. The wording
 * matters: people will tap yes to anything that sounds like a convenience, so
 * the setting says what it risks, not what it saves.
 */
export const SHARED_DEVICE_WARNING =
  'Only turn this on for a phone that is yours alone. On a shared handset, anyone whose face or fingerprint is set up on the device could open your account.';
