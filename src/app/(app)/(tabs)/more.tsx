import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import { Button, COLORS, EmptyState, Group, GroupLabel, ListRow, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { WORKSPACES, WORKSPACE_GROUPS } from '@/features/workspaces/catalog';
import { openErp } from '@/features/workspaces/open-erp';

/** "All workspaces" — the module directory from mockup 01, right-hand phone. */
export default function More() {
  const { company, session, signOut } = useAuth();
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? WORKSPACES.filter((w) => w.label.toLowerCase().includes(q)) : WORKSPACES;
  }, [query]);

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader
          inlinePill
          context={company ? company.name : 'Foodline'}
          initials={initialsFrom(company?.name)}
        />

        <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-3">
          <Text className="text-3xl font-bold text-ink">All workspaces</Text>

          <View className="flex-row items-center gap-2 rounded-2xl border border-surface-line bg-surface-card px-4">
            <Feather name="search" size={18} color={COLORS.inkFaint} />
            <TextInput
              className="h-12 flex-1 text-base text-ink"
              placeholder="Find a module or setting"
              placeholderTextColor="#8A96AF"
              autoCapitalize="none"
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {matches.length === 0 ? (
            <EmptyState title="No modules match" hint="Try a shorter search." />
          ) : (
            WORKSPACE_GROUPS.map((group) => {
              const rows = matches.filter((w) => w.group === group);
              if (rows.length === 0) return null;
              return (
                <View key={group} className="gap-2">
                  <GroupLabel label={group} />
                  <Group>
                    {rows.map((w) => (
                      <ListRow
                        key={w.key}
                        icon={w.icon}
                        title={w.label}
                        subtitle={w.erpPath ? 'Open live ERP' : undefined}
                        onPress={
                          w.route
                            ? () => router.push(w.route as never)
                            : w.erpPath
                              ? () => void openErp(w.erpPath!)
                              : undefined
                        }
                      />
                    ))}
                  </Group>
                </View>
              );
            })
          )}

          <View className="gap-2 pt-2">
            <GroupLabel label="Session" />
            <Group>
              <ListRow
                icon="briefcase"
                title={company?.name ?? 'No company'}
                subtitle={`${session?.companies.length ?? 0} available`}
                onPress={
                  (session?.companies.length ?? 0) > 1
                    ? () => router.push('/(auth)/select-company')
                    : undefined
                }
              />
            </Group>
            <View className="pt-2">
              <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
