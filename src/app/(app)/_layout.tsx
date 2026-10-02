import { Stack, usePathname } from 'expo-router';
import React from 'react';
import { Alert, View } from 'react-native';

import { COLORS } from '@/components/ui';
import { CopilotBlob } from '@/components/CopilotBlob';

/**
 * No auth check here any more — `AppAuthGate` (root _layout.tsx) only
 * mounts this at all once there's a session and a company.
 */
export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTintColor: COLORS.brand,
          headerTitleStyle: { color: COLORS.ink, fontWeight: '700' },
          headerStyle: { backgroundColor: COLORS.surface },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.surface },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sales" options={{ title: 'Sales & Customers' }} />
        <Stack.Screen name="inventory" options={{ title: 'Inventory' }} />
        <Stack.Screen name="purchasing" options={{ title: 'Purchasing' }} />
        <Stack.Screen name="receiving" options={{ title: 'Receiving' }} />
        <Stack.Screen name="routes" options={{ title: 'Routes & Delivery' }} />
        <Stack.Screen name="stop/[id]" options={{ title: 'Stop' }} />
        <Stack.Screen name="tools/[module]" options={{ title: 'Tools' }} />
        <Stack.Screen name="customer/[id]" options={{ title: 'Customer' }} />
        <Stack.Screen name="routine/[id]" options={{ title: 'Routine' }} />
        <Stack.Screen name="shipment/[orderId]" options={{ title: 'Post shipment' }} />
        <Stack.Screen name="account" options={{ title: 'Account' }} />
        <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
        <Stack.Screen name="recall/[itemId]" options={{ title: 'Start a recall' }} />
        <Stack.Screen name="purchasing/new" options={{ title: 'New purchase order' }} />
        <Stack.Screen name="sales/new" options={{ title: 'New sales order' }} />
        <Stack.Screen name="sales-order/[id]" options={{ title: 'Sales order' }} />
        <Stack.Screen name="sales-order/[id]/short" options={{ title: 'Resolve a short' }} />
        <Stack.Screen name="purchasing/[id]" options={{ title: 'Purchase order' }} />
        <Stack.Screen name="vendor/[id]" options={{ title: 'Vendor' }} />
        <Stack.Screen name="ai" options={{ title: 'Copilot' }} />
        <Stack.Screen name="receiving/documents" options={{ title: 'Delivery documents' }} />
        <Stack.Screen name="receiving/document/[id]" options={{ title: 'Review document' }} />
      </Stack>
      <GlobalCopilot />
    </View>
  );
}

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/my-work': 'My Work',
  '/activity': 'Activity',
  '/search': 'Search',
  '/more': 'Workspaces',
  '/sales': 'Sales & Customers',
  '/inventory': 'Inventory',
  '/purchasing': 'Purchasing',
  '/receiving': 'Receiving',
  '/routes': 'Routes & Delivery',
  '/account': 'Account',
};

/**
 * B9 — the AI present in every module (Chris's 31 Aug ask), as a floating
 * entry point rather than a tab-bar rewrite. `contracts/design.md`'s raised
 * centre AI *tab* was explicitly deferred out of v3 because it touches every
 * screen's navigation; this delivered component (CopilotBlob) answers the
 * same ask without that risk — it's an overlay, not a nav change.
 *
 * Page-aware only as far as a route-to-label lookup for now; the real
 * "what's on this screen" context and suggestions need a live Copilot
 * backend that doesn't exist yet. `onAsk` intentionally does not fabricate a
 * response — same discipline as the rest of this app's "AI connection
 * pending" states elsewhere.
 */
function GlobalCopilot() {
  const pathname = usePathname();
  const contextLabel = ROUTE_LABELS[pathname] ?? 'Foodline AI';

  return (
    <CopilotBlob
      contextLabel={contextLabel}
      onRunSuggestion={() => {}}
      onAsk={() => {
        // The blob's own sheet has no reply channel — it closes on send. No
        // Copilot backend exists yet either, so this says so plainly rather
        // than fabricating a reply or letting the question vanish silently.
        Alert.alert('Not connected yet', "The Copilot isn't wired to a live AI service in this build.");
      }}
    />
  );
}
