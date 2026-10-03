import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, Screen } from '@/components/ui';

export default function NewSalesOrder() {
  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <EmptyState
          title="Sales order entry is not available yet"
          hint="This workflow will stay in the app once its governed create command and live pricing contract are connected."
        />
      </SafeAreaView>
    </Screen>
  );
}
