import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, Group, ListRow, Loading, Screen, StaleBanner, StatusPill } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import type { ReviewStatus } from '@/features/receiving/documents/types';
import { api } from '@/lib/api';

const STATUS_LABEL: Record<ReviewStatus, string> = {
  'pending-review': 'Needs review',
  'in-review': 'In review',
  approved: 'Received',
  rejected: 'Rejected',
};
const PILL: Record<ReviewStatus, string> = {
  'pending-review': 'partial',
  'in-review': 'partial',
  approved: 'ok',
  rejected: 'out',
};

/** Parsed delivery documents waiting for a person — `list_governed_receiving_document_reviews`. */
export default function ReceivingDocuments() {
  const companyId = useCompanyId();
  const reviews = useQuery({
    queryKey: ['receiving', 'documents', companyId],
    queryFn: () => api.documents.list(companyId),
  });

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={[]}>
        {reviews.isPending ? (
          <Loading label="Loading documents" />
        ) : reviews.isLoadingError ? (
          <ErrorState message={(reviews.error as Error).message} onRetry={() => reviews.refetch()} />
        ) : (
          <ScrollView
            contentContainerClassName="gap-4 px-5 pb-10 pt-3"
            refreshControl={<RefreshControl refreshing={reviews.isRefetching} onRefresh={() => reviews.refetch()} />}
          >
            {reviews.isRefetchError ? <StaleBanner updatedAt={reviews.dataUpdatedAt} /> : null}
            <Text className="text-sm text-ink-muted">
              Delivery paperwork the system has read. Nothing is received until you review and approve it.
            </Text>
            {reviews.data.length === 0 ? (
              <EmptyState title="No documents waiting" hint="Delivery documents appear here once they are received and parsed." />
            ) : (
              <Group>
                {reviews.data.map((r, i) => (
                  <ListRow
                    key={r.reviewId}
                    icon="file-text"
                    title={`${r.supplierDocumentNumber ?? 'Document'} · ${r.vendorLabel ?? r.sender}`}
                    subtitle={`${r.purchaseOrderLabel ?? 'No order matched'} · ${r.lineCount} line${r.lineCount === 1 ? '' : 's'}`}
                    trailing={<StatusPill status={PILL[r.status]} label={STATUS_LABEL[r.status]} />}
                    onPress={() => router.push(`/(app)/receiving/document/${r.reviewId}`)}
                    first={i === 0}
                    last={i === reviews.data.length - 1}
                  />
                ))}
              </Group>
            )}
            <View />
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}
