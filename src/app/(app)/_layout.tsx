import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { COLORS } from '@/components/ui';
import { PageContextProvider } from '@/features/copilot/page-context';
import { VoiceOverlay } from '@/features/copilot/voice/VoiceOverlay';
import { VoiceProvider } from '@/features/copilot/voice/VoiceProvider';

/**
 * No auth check here any more — `AppAuthGate` (root _layout.tsx) only
 * mounts this at all once there's a session and a company.
 */
export default function AppLayout() {
  return (
    <PageContextProvider>
      <VoiceProvider>
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
            <Stack.Screen name="receiving/documents" options={{ title: 'Delivery documents' }} />
            <Stack.Screen name="receiving/document/[id]" options={{ title: 'Review document' }} />
          </Stack>
          <VoiceOverlay />
        </View>
      </VoiceProvider>
    </PageContextProvider>
  );
}
