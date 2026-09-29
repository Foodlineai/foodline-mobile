import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import { EmptyState, Group, GroupLabel, ListRow, Screen, ViewBadge } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { toolsModule } from '@/features/workspaces/tools-catalog';

/** One screen serves every "<Module> tools" directory — they differ only in data. */
export default function ToolsScreen() {
  const { module } = useLocalSearchParams<{ module: string }>();
  const { company } = useAuth();
  const mod = toolsModule(module);

  if (!mod) {
    return (
      <Screen>
        <SafeAreaView className="flex-1" edges={['top']}>
          <EmptyState title="Unknown module" hint="That tools directory does not exist." />
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context={mod.context} initials={initialsFrom(company?.name)} />
        <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-3">
          <Text className="text-3xl font-bold text-ink">{mod.title}</Text>

          {mod.groups.map((group) => {
            const rows = mod.tools.filter((t) => t.group === group);
            if (rows.length === 0) return null;
            return (
              <View key={group} className="gap-2">
                <GroupLabel label={group} />
                <Group>
                  {rows.map((t) => (
                    <ListRow
                      key={t.key}
                      icon={t.icon}
                      title={t.label}
                      subtitle={t.route ? undefined : 'Coming soon'}
                      trailing={t.badge === 'view' ? <ViewBadge /> : undefined}
                      onPress={t.route ? () => router.push(t.route as never) : undefined}
                    />
                  ))}
                </Group>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
