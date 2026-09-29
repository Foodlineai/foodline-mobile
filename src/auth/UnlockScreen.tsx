import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FoodlineButton } from '../components/FoodlineButton';
import { Card } from '../components/primitives';
import { colors, radius, space, type as typeScale } from '../theme/tokens';
import {
  getCapability,
  SHARED_DEVICE_WARNING,
  type BiometricCapability,
  type UnlockResult,
} from './biometrics';

/**
 * The lock screen. Shown when the app resumes and biometric unlock is enabled.
 *
 * It prompts immediately on mount rather than waiting for a tap — a selector
 * picking the phone up wants it open, not a button to press first. The manual
 * button exists only for the retry after a cancel.
 *
 * There is always a visible way out. "Sign in with password instead" is not a
 * fallback bolted on for completeness; it is the path someone takes with gloved
 * hands, a wet screen, or a face the sensor refuses in a cold room — and if it
 * is missing they are locked out mid-shift.
 */

export type UnlockScreenProps = {
  actorName: string;
  /** Called on mount and on retry. */
  onUnlock: () => Promise<UnlockResult>;
  onUseFullSignIn: () => void;
  onUnlocked: (refreshToken: string) => void;
};

export function UnlockScreen({
  actorName,
  onUnlock,
  onUseFullSignIn,
  onUnlocked,
}: UnlockScreenProps) {
  const [cap, setCap] = useState<BiometricCapability | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void getCapability().then((c) => live && setCap(c));
    void attempt();
    return () => {
      live = false;
    };
    // Prompting once on mount is the point; re-running on every render is not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function attempt() {
    setBusy(true);
    setMessage(null);
    const result = await onUnlock();
    setBusy(false);

    if (result.ok) {
      onUnlocked(result.refreshToken);
      return;
    }

    setMessage(
      result.reason === 'invalidated'
        ? 'The biometrics on this device changed, so quick sign-in was turned off. Sign in once to set it up again.'
        : result.reason === 'unavailable'
          ? 'Quick sign-in is not set up on this device.'
          : null, // a plain cancel needs no scolding
    );
  }

  const label = cap?.label ?? 'Unlock';

  return (
    <LinearGradient
      colors={['#16297E', colors.ink.DEFAULT]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.dark}
    >
      <View style={styles.body}>
        <View style={styles.glyphRing}>
          <Text style={styles.glyph}>{cap?.kind === 'fingerprint' ? '☉' : '⬡'}</Text>
        </View>

        <Text style={styles.welcome}>Welcome back, {actorName.split(' ')[0]}</Text>
        <Text style={styles.hint}>Use {label} to continue</Text>

        {message && <Text style={styles.message}>{message}</Text>}
      </View>

      <View style={styles.foot}>
        <FoodlineButton
          label={`Unlock with ${label}`}
          busy={busy}
          onPress={() => void attempt()}
          testID="unlock-retry"
        />
        <Pressable onPress={onUseFullSignIn} accessibilityRole="button" style={styles.altBtn}>
          <Text style={styles.alt}>Sign in with your password instead</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

/* ── Opt-in setting ────────────────────────────────────────────────────── */

/**
 * The toggle, for the account screen. Off by default.
 *
 * The copy says what it risks rather than what it saves. People tap yes to
 * anything that sounds like a convenience, and on a shared warehouse handset the
 * cost of a careless yes is someone else's session.
 */
export type BiometricSettingProps = {
  enabled: boolean;
  onChange: (next: boolean) => void;
};

export function BiometricSetting({ enabled, onChange }: BiometricSettingProps) {
  const [cap, setCap] = useState<BiometricCapability | null>(null);

  useEffect(() => {
    let live = true;
    void getCapability().then((c) => live && setCap(c));
    return () => {
      live = false;
    };
  }, []);

  if (!cap) return null;

  if (!cap.available) {
    return (
      <Card>
        <Text style={styles.settingTitle}>Quick sign-in</Text>
        <Text style={styles.settingNote}>This device has no biometric or PIN unlock.</Text>
      </Card>
    );
  }

  if (!cap.enrolled) {
    return (
      <Card>
        <Text style={styles.settingTitle}>Quick sign-in</Text>
        <Text style={styles.settingNote}>
          Set up {cap.label} in your device settings first, then turn this on here.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.settingRow}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>Sign in with {cap.label}</Text>
          <Text style={styles.settingNote}>Skip the sign-in page when you open the app.</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onChange}
          trackColor={{ true: colors.brand.DEFAULT, false: colors.hairline.DEFAULT }}
          accessibilityLabel={`Sign in with ${cap.label}`}
        />
      </View>

      <View style={styles.warning}>
        <Text style={styles.warningText}>{SHARED_DEVICE_WARNING}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  dark: { flex: 1, paddingHorizontal: 28 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },

  glyphRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(157,185,248,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  glyph: { fontSize: 40, color: '#9DB9F8' },

  welcome: { ...typeScale.titleSm, color: '#FFFFFF', textAlign: 'center' },
  hint: { ...typeScale.body, color: '#9DB9F8', textAlign: 'center' },
  message: {
    ...typeScale.small,
    color: '#FBE2E0',
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 6,
  },

  foot: { paddingBottom: 44, gap: 4 },
  altBtn: { paddingVertical: 12, minHeight: space.tap, justifyContent: 'center' },
  alt: {
    ...typeScale.small,
    color: '#9DB9F8',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingText: { flex: 1 },
  settingTitle: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  settingNote: { ...typeScale.small, color: colors.ink.subtle, marginTop: 2 },

  warning: {
    marginTop: 12,
    padding: 11,
    borderRadius: radius.input,
    backgroundColor: colors.warn.tint,
    borderWidth: 1,
    borderColor: colors.warn.line,
  },
  warningText: { ...typeScale.small, color: colors.warn.ink },
});
