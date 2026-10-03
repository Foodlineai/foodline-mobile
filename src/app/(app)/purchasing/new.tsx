import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, Screen } from '@/components/ui';

export default function NewPurchaseOrder() {
  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <EmptyState
          title="Purchase order entry is not available yet"
          hint="This workflow will stay in the app once its governed draft and submit commands are connected."
        />
      </SafeAreaView>
    </Screen>
  );
}
