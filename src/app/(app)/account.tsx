import { router } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Group, GroupLabel, ListRow, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';

/**
 * Account — session info and sign-out, split out of the "More" tab now that
 * it's the persona-scoped workspace directory (B11).
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
 */
export default function Account() {
  const { company, session, signOut } = useAuth();

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
        <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
      </SafeAreaView>
    </Screen>
  );
}
