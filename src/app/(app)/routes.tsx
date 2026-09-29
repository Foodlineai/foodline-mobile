import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, Loading, Screen, StaleBanner } from '@/components/ui';
import { toRouteSummary } from '@/features/routes/adapter';
import { RouteScreen } from '@/features/routes/RouteScreen';
import { useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';

/**
 * Screen 11 — Route, map and table (D3). `RouteScreen` is the delivered,
 * self-contained view; this route supplies live data via the adapter and
 * navigation. The map itself is an unmade decision (see RouteScreen.tsx's
 * own header) — `mapContent` stays unset, which renders the labelled
 * placeholder the delivered screen already handles.
 */
export default function Routes() {
  const companyId = useCompanyId();
  const route = useQuery({ queryKey: ['route', 'today', companyId], queryFn: () => api.routes.today(companyId) });

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        {route.isRefetchError ? <StaleBanner updatedAt={route.dataUpdatedAt} /> : null}

        {route.isPending ? (
          <Loading label="Loading your route" />
        ) : route.isLoadingError ? (
          <ErrorState message={(route.error as Error).message} onRetry={() => route.refetch()} />
        ) : !route.data ? (
          <EmptyState title="No route assigned" hint="Routes appear here once dispatch assigns one to you." />
        ) : (
          <RouteScreen
            route={toRouteSummary(route.data)}
            onOpenStop={(stop) => router.push(`/stop/${stop.id}` as never)}
          />
        )}
      </SafeAreaView>
    </Screen>
  );
}
