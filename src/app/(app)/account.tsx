import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BiometricSetting } from '@/auth/UnlockScreen';
import { disableUnlock, enableUnlock, isEnabled } from '@/auth/biometrics';
import { Button, Group, GroupLabel, ListRow, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import * as workos from '@/features/auth/workos';

/**
 * Account — session info, sign-out, and biometric quick sign-in (drop 7),
 * split out of the "More" tab now that it's the persona-scoped workspace
 * directory (B11).
 *
 * The delivered `AccountScreen` (src/auth/AuthGate.tsx) is the fuller
 * version of this — actor name/email, "what you can reach" per persona,
 * switch company — but it needs an `Actor` with a real name and email, and
 * `application_session_context` doesn't return either (confirmed against
 * the live RPC). They're likely available as standard OIDC claims on the
 * WorkOS ID token itself (the auth scopes already request `profile` and
 * `email`), just not decoded and threaded through anywhere yet. Until
 * that's wired, this stays the lighter screen that only uses data this app
 * already has, rather than showing a name that isn't real.
 *
 * Biometric unlock protects a real WorkOS refresh token — meaningless in
 * demo mode, which has no such token — so the toggle only renders in live
 * mode. **Only the opt-in setting is wired here.** Actually showing
 * `UnlockScreen` on app resume — the other half of "biometric unlock" — is
 * deliberately not done this pass: the delivered README itself flags an
 * open policy question ("should this be disallowed entirely for personas
 * on shared handsets — inventory, driver?") that needs a product decision,
 * and the resume-detection plumbing (AppState listeners; nothing in this
 * app currently reacts to foreground/background) doesn't exist yet either.
 * Turning the setting on today safely stores a protected token and does
 * nothing further — it doesn't yet change how the app behaves on resume.
 */
export default function Account() {
  const { company, session, signOut } = useAuth();
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void isEnabled().then((v) => live && setBioEnabled(v));
    return () => {
      live = false;
    };
  }, []);

  async function onToggleBiometric(next: boolean) {
    setBioError(null);
    if (!next) {
      await disableUnlock();
      setBioEnabled(false);
      return;
    }
    const token = await workos.getRefreshToken();
    if (!token) {
      setBioError('No active session token to protect — try signing in again first.');
      return;
    }
    const ok = await enableUnlock(token);
    setBioEnabled(ok);
    if (!ok) setBioError('Could not verify — quick sign-in was not turned on.');
  }

  return (
    <Screen>
      <SafeAreaView className="flex-1 gap-4 px-5 pt-4" edges={['top']}>
        <GroupLabel label="Session" />
        <Group>
          <ListRow
            icon="briefcase"
            title={company?.name ?? 'No company'}
            subtitle={`${session?.companies.length ?? 0} available`}
            onPress={
              (session?.companies.length ?? 0) > 1
                ? () => router.push('/(auth)/select-company')
                : undefined
            }
          />
        </Group>

        <GroupLabel label="Security" />
        <BiometricSetting enabled={bioEnabled} onChange={(next) => void onToggleBiometric(next)} />
        {bioError ? <Text className="text-sm text-danger">{bioError}</Text> : null}

        <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
      </SafeAreaView>
    </Screen>
  );
}
