import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { COLORS, Loading, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';

export default function AppLayout() {
  const { session, companyId, loading } = useAuth();

  if (loading) {
    return (
      <Screen>
        <Loading label="Starting Foodline" />
      </Screen>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!companyId) return <Redirect href="/(auth)/select-company" />;

  return (
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
    </Stack>
  );
}
