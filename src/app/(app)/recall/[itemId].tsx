import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

import { RecallScreen } from '@/features/recalls/RecallScreen';
import { demoRecallTarget } from '@/features/recalls/fixtures';

/**
 * Screen 10 — Start a recall (D2). `RecallTarget` needs lot-level
 * traceability (lot code, blast radius, customers/orders affected) that
 * `product_directory_snapshot` doesn't carry — that's a different RPC,
 * unresearched this session. Uses the delivered fixture for the lot data,
 * with the real item's own name/id substituted in rather than the fixture's.
 *
 * `onContinueToReview` has nowhere real to go — the review step itself
 * wasn't part of this drop. Says so rather than pretending to continue.
 */
export default function Recall() {
  const { itemId, name } = useLocalSearchParams<{ itemId: string; name?: string }>();

  const target = {
    ...demoRecallTarget,
    itemId: itemId ?? demoRecallTarget.itemId,
    itemName: name ?? demoRecallTarget.itemName,
  };

  return (
    <RecallScreen
      target={target}
      onContinueToReview={() => {
        Alert.alert('Not built yet', "The recall review step wasn't part of this drop.");
      }}
      onCancel={() => router.back()}
    />
  );
}
