import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, Screen } from '@/components/ui';

export default function StartRecall() {
  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <EmptyState
          title="Recall initiation is not available yet"
          hint="This workflow will stay in the app once lot traceability and the governed recall command are connected."
        />
      </SafeAreaView>
    </Screen>
  );
}
