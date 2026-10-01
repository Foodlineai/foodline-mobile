import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { openLiveErp } from '@/lib/open-erp';
import { Button, Card, COLORS, Screen } from './ui';

export function LiveErpFlow({ title, description, path }: { title: string; description: string; path: string }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (opening) return;
    setOpening(true);
    setError(null);
    try {
      await openLiveErp(path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The live ERP could not be opened.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <Screen>
      <SafeAreaView className="flex-1 justify-center gap-5 px-5" edges={['bottom']}>
        <View className="items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-tint">
            <Feather name="external-link" size={26} color={COLORS.brand} />
          </View>
          <Text className="text-center text-3xl font-bold text-ink">{title}</Text>
          <Text className="text-center text-base leading-6 text-ink-muted">{description}</Text>
        </View>
        <Card className="gap-2 p-4">
          <Text className="font-bold text-ink">Live data and actions</Text>
          <Text className="text-sm leading-5 text-ink-muted">
            This opens the production Foodline ERP workflow. Changes are written through its governed
            Supabase commands and appear in the mobile app after refresh.
          </Text>
          {error ? <Text className="text-sm font-semibold text-danger">{error}</Text> : null}
        </Card>
        <View className="gap-3">
          <Button label="Continue in live ERP" icon="external-link" loading={opening} onPress={() => void open()} />
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    </Screen>
  );
}
