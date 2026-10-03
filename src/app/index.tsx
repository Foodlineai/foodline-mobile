import { Redirect } from 'expo-router';
import React from 'react';

/**
 * `AppAuthGate` (root _layout.tsx) only ever mounts this Stack once auth
 * state is 'ready' or 'expired' — every earlier state (restoring, signed-
 * out, authenticating, bootstrapping, choosing-company) renders its own
 * full-screen replacement instead of `children`, so by the time this
 * component runs there is always a session and a company.
 */
export default function Index() {
  return <Redirect href="/(app)/(tabs)" />;
}
