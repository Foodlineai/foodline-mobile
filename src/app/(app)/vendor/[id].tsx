import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { VendorDetailScreen } from '@/features/vendors/VendorDetailScreen';
import { api } from '@/lib/api';

/**
 * Detail screen for a single vendor — `contracts/flows.md`'s build order
 * item 4. On `vendor_read` (confirmed against the live ERP source 1 Oct —
 * see `features/vendors/adapter.ts`).
 */
export default function VendorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useCompanyId();

  const detail = useQuery({
    queryKey: ['vendor', 'detail', companyId, id],
    queryFn: () => api.vendors.detail(companyId, id!),
    enabled: Boolean(id),
  });

  if (detail.isPending) {
    return (
      <Screen>
        <Loading label="Loading vendor" />
      </Screen>
    );
  }
  if (detail.isLoadingError) {
    return (
      <Screen>
        <ErrorState message={(detail.error as Error).message} onRetry={() => detail.refetch()} />
      </Screen>
    );
  }
  if (!detail.data) {
    return (
      <Screen>
        <EmptyState title="Vendor not found" hint="It may have been deactivated or reassigned." />
      </Screen>
    );
  }

  return <VendorDetailScreen vendor={detail.data} />;
}
