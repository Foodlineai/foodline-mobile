import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import React, { useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import {
  Button,
  EmptyState,
  ErrorState,
  Group,
  ListRow,
  Loading,
  Screen,
  StaleBanner,
  StatusPill,
} from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import type { CycleCountSession, CycleCountSheetSummary } from './types';

type Selection = { sessionId: string; sheetId: string; canExecute: boolean };

const OPEN_SHEET_STATUSES = new Set(['available', 'in_progress', 'recount_required']);
const QUANTITY = /^(0|[1-9]\d{0,25})(?:\.\d{1,12})?$/;

export function CycleCountsScreen() {
  const companyId = useCompanyId();
  const { company } = useAuth();
  const [selected, setSelected] = useState<Selection | null>(null);

  if (selected) {
    return (
      <CountSheet
        companyId={companyId}
        sessionId={selected.sessionId}
        sheetId={selected.sheetId}
        canExecute={selected.canExecute}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <CountDirectory
      companyId={companyId}
      companyName={company?.name}
      onOpen={(session, sheet, canExecute) =>
        setSelected({
          sessionId: session.id,
          sheetId: sheet.id,
          canExecute,
        })
      }
    />
  );
}

function CountDirectory({
  companyId,
  companyName,
  onOpen,
}: {
  companyId: string;
  companyName?: string;
  onOpen: (session: CycleCountSession, sheet: CycleCountSheetSummary, canExecute: boolean) => void;
}) {
  const workspace = useQuery({
    queryKey: ['cycle-counts', companyId],
    queryFn: () => api.cycleCounts.workspace(companyId),
  });
  const rows = workspace.data?.sessions.flatMap((session) =>
    session.sheets.map((sheet) => ({ session, sheet })),
  ) ?? [];

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context="Inventory · Cycle counts" initials={initialsFrom(companyName)} />
        {workspace.isPending ? (
          <Loading label="Loading cycle counts" />
        ) : workspace.isLoadingError ? (
          <ErrorState message={(workspace.error as Error).message} onRetry={() => workspace.refetch()} />
        ) : (
          <ScrollView
            contentContainerClassName="gap-5 px-5 pb-10 pt-4"
            refreshControl={
              <RefreshControl refreshing={workspace.isRefetching} onRefresh={() => workspace.refetch()} />
            }
          >
            <View className="gap-1">
              <Text className="text-3xl font-bold text-ink">Cycle counts</Text>
              <Text className="text-sm text-ink-muted">
                Live assigned sheets. Expected stock stays hidden while a blind count is in progress.
              </Text>
            </View>
            {workspace.isRefetchError ? <StaleBanner updatedAt={workspace.dataUpdatedAt} /> : null}
            {!workspace.data.permissions.canRead ? (
              <EmptyState title="Cycle counts unavailable" hint="Your current company access cannot read counts." />
            ) : rows.length === 0 ? (
              <EmptyState title="No cycle counts" hint="Assigned count sheets will appear here." />
            ) : (
              <Group>
                {rows.map(({ session, sheet }) => (
                  <ListRow
                    key={`${session.id}:${sheet.id}`}
                    icon="check-square"
                    title={`${session.documentNumber} · Sheet ${sheet.sheetNumber}`}
                    subtitle={`${session.warehouseName} · ${sheet.completedLineCount}/${sheet.lineCount} counted`}
                    trailing={<StatusPill status={statusTone(sheet.status)} label={statusLabel(sheet.status)} />}
                    onPress={() => onOpen(session, sheet, workspace.data.permissions.canExecute)}
                  />
                ))}
              </Group>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}

function CountSheet({
  companyId,
  sessionId,
  sheetId,
  canExecute,
  onBack,
}: {
  companyId: string;
  sessionId: string;
  sheetId: string;
  canExecute: boolean;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const { company } = useAuth();
  const detail = useQuery({
    queryKey: ['cycle-counts', companyId, sessionId, sheetId],
    queryFn: () => api.cycleCounts.sheet(companyId, sessionId, sheetId),
  });
  const [lease, setLease] = useState<Awaited<ReturnType<typeof api.cycleCounts.claim>> | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef(new Map<string, string>());

  const values = useMemo(() => {
    if (!detail.data) return counts;
    return Object.fromEntries(
      detail.data.lines.map((line) => [line.id, counts[line.id] ?? line.enteredQuantity ?? '']),
    );
  }, [counts, detail.data]);

  const intentKey = (signature: string) => {
    const existing = keys.current.get(signature);
    if (existing) return existing;
    const created = Crypto.randomUUID();
    keys.current.set(signature, created);
    return created;
  };

  const claim = async () => {
    if (!detail.data || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.cycleCounts.claim(companyId, {
        countId: detail.data.sheet.id,
        expectedVersion: detail.data.sheet.version,
        idempotencyKey: intentKey(`claim:${detail.data.sheet.id}:${detail.data.sheet.version}`),
      });
      setLease(result);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  const saveAndSubmit = async () => {
    if (!detail.data || !lease || busy) return;
    const invalid = detail.data.lines.filter((line) => !QUANTITY.test(values[line.id] ?? ''));
    if (invalid.length > 0) {
      setError('Enter a non-negative physical quantity for every line. Use up to 12 decimal places.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const entries = detail.data.lines.map((line) => {
        const enteredQuantity = values[line.id]!;
        return {
          countLineId: line.id,
          enteredQuantity,
          expectedEntryVersion: line.entryVersion,
          idempotencyKey: intentKey(
            `entry:${detail.data.session.id}:${lease.leaseFence}:${line.id}:${line.entryVersion}:${enteredQuantity}`,
          ),
        };
      });
      await api.cycleCounts.saveEntries(companyId, {
        countId: detail.data.session.id,
        leaseToken: lease.leaseToken,
        leaseFence: lease.leaseFence,
        entries,
      });
      await api.cycleCounts.submit(companyId, {
        countId: detail.data.sheet.id,
        expectedVersion: lease.sheetVersion,
        leaseToken: lease.leaseToken,
        leaseFence: lease.leaseFence,
        idempotencyKey: intentKey(
          `submit:${detail.data.sheet.id}:${lease.sheetVersion}:${lease.leaseFence}:${lease.leaseToken}`,
        ),
      });
      keys.current.clear();
      setLease(null);
      await queryClient.invalidateQueries({ queryKey: ['cycle-counts', companyId] });
      await detail.refetch();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context="Inventory · Cycle count" initials={initialsFrom(company?.name)} />
        {detail.isPending ? (
          <Loading label="Loading count sheet" />
        ) : detail.isLoadingError ? (
          <ErrorState message={(detail.error as Error).message} onRetry={() => detail.refetch()} />
        ) : (
          <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-4">
            <Button label="Back to cycle counts" variant="ghost" icon="arrow-left" onPress={onBack} />
            <View className="gap-1">
              <Text className="text-3xl font-bold text-ink">{detail.data.session.documentNumber}</Text>
              <Text className="text-sm text-ink-muted">
                {detail.data.session.warehouseName} · Sheet {detail.data.sheet.sheetNumber}
              </Text>
              <StatusPill status={statusTone(detail.data.sheet.status)} label={statusLabel(detail.data.sheet.status)} />
            </View>

            <View className="gap-3">
              {detail.data.lines.map((line) => (
                <View key={line.id} className="gap-3 rounded-2xl border border-surface-line bg-surface-card p-4">
                  <View className="gap-0.5">
                    <Text className="text-base font-bold text-ink">{line.productName}</Text>
                    <Text className="text-sm text-ink-muted">
                      {line.sku} · {line.disposition} · {line.uom}
                    </Text>
                  </View>
                  {lease ? (
                    <TextInput
                      value={values[line.id]}
                      onChangeText={(value) => setCounts((current) => ({ ...current, [line.id]: value }))}
                      keyboardType="decimal-pad"
                      placeholder="Physical quantity"
                      accessibilityLabel={`Physical quantity for ${line.productName}`}
                      className="min-h-12 rounded-xl border border-surface-line bg-surface px-4 text-base text-ink"
                    />
                  ) : (
                    <Text className="text-sm font-semibold text-ink">
                      {line.enteredQuantity === null ? 'Not counted' : `${line.enteredQuantity} ${line.uom} counted`}
                    </Text>
                  )}
                  {line.expectedQuantity !== null && line.varianceQuantity !== null ? (
                    <Text className="text-sm text-ink-muted">
                      Expected {line.expectedQuantity} · variance {line.varianceQuantity}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>

            {error ? <Text className="text-sm font-semibold text-danger">{error}</Text> : null}
            {lease ? (
              <Button label="Save and submit count" loading={busy} disabled={busy} onPress={() => void saveAndSubmit()} />
            ) : canExecute && OPEN_SHEET_STATUSES.has(detail.data.sheet.status) ? (
              <Button label="Claim count sheet" loading={busy} disabled={busy} onPress={() => void claim()} />
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(status: string): string {
  if (status === 'posted' || status === 'approved') return 'ok';
  if (status === 'recount_required') return 'low';
  return 'open';
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'The cycle count request could not be completed.';
}
