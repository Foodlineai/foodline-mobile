import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { WorkspaceDirectoryScreen } from '@/features/workspaces/WorkspaceDirectoryScreen';
import { builtWorkspaces } from '@/personas/fixtures';
import type { WorkspaceId } from '@/personas/types';
import { openLiveErp } from '@/lib/open-erp';

/** Where each buildable workspace actually lives. Workspaces with no route
 * here render "Coming soon" from the directory screen itself. */
const WORKSPACE_ROUTES: Partial<Record<WorkspaceId, string>> = {
  sales: '/sales',
  purchasing: '/purchasing',
  inventory: '/inventory',
  warehouse: '/receiving',
  routes: '/routes',
};

const ERP_WORKSPACE_ROUTES: Partial<Record<WorkspaceId, string>> = {
  finance: '/accounts-payable',
  reports: '/reports',
  data: '/integrations',
  settings: '/setup',
};

/**
 * "All workspaces" — now persona-scoped (B11). `WorkspaceDirectoryScreen` is
 * the delivered, self-contained screen (title, persona pill, search,
 * groups) — this route only supplies persona + navigation. Account/sign-out
 * moved to its own screen (`/account`, reachable from the header avatar)
 * rather than sharing this one — the delivered screen is a single
 * full-height ScrollView, and a second scrolling section below it fights it
 * for space rather than sitting neatly under it.
 */
export default function More() {
  const { persona } = useAuth();

  if (!persona) {
    return (
      <Screen>
        <SafeAreaView className="flex-1" edges={['top']}>
          <EmptyState title="No company selected" />
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <SafeAreaView className="flex-1" edges={['top']}>
        <WorkspaceDirectoryScreen
          persona={persona}
          built={[...builtWorkspaces] as WorkspaceId[]}
          onOpen={(workspace) => {
            const route = WORKSPACE_ROUTES[workspace.id];
            if (route) {
              router.push(route as never);
              return;
            }
            const erpRoute = ERP_WORKSPACE_ROUTES[workspace.id];
            if (erpRoute) void openLiveErp(erpRoute);
          }}
        />
      </SafeAreaView>
    </View>
  );
}
