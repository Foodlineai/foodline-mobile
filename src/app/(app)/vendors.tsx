import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';

import { ErrorState, Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { VendorDirectoryScreen } from '@/features/vendors/VendorDirectoryScreen';
import { api } from '@/lib/api';

export default function VendorsRoute() {
  const companyId = useCompanyId();
  const vendors = useQuery({
    queryKey: ['vendors', 'directory', companyId],
    queryFn: () => api.vendors.list(companyId),
  });

  if (vendors.isPending) {
    return (
      <Screen>
        <Loading label="Loading vendors" />
      </Screen>
    );
  }
  if (vendors.isError) {
    return (
      <Screen>
        <ErrorState message={(vendors.error as Error).message} onRetry={() => vendors.refetch()} />
      </Screen>
    );
  }

  return (
    <VendorDirectoryScreen
      vendors={vendors.data}
      onOpenVendor={(vendor) => router.push(`/vendor/${vendor.id}`)}
    />
  );
}
