import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Group,
  GroupLabel,
  ListRow,
  Loading,
  NoticeCard,
  Screen,
  StaleBanner,
  StatusPill,
} from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { api, type DockReceipt, type ReceivingTask, type ScannerSession } from '@/lib/api';

/**
 * Receiving, end to end on the ERP's scanner subsystem:
 *
 *   list_receiving_location_warehouses  → pick where you are standing
 *   get_governed_receiving_dock         → pick the delivery in front of you
 *   start_scanner_session               → claim the work
 *   get_governed_scanner_receiving_queue→ what is still owed
 *   submit_scanner_scan                 → record each case
 *   close_scanner_session               → hand the session back
 *
 * Every mutation carries a row version (optimistic concurrency) and an
 * idempotency key, so a dropped connection mid-scan cannot double-count stock.
 * Do not "simplify" a retry by dropping either.
 */
export default function Receiving() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DockReceipt | null>(null);
  const [session, setSession] = useState<ScannerSession | null>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const busy = useRef(false);

  const warehouses = useQuery({
    queryKey: ['receiving', 'warehouses', companyId],
    queryFn: () => api.receiving.warehouses(companyId),
  });

  // One warehouse is the common case — skip a pointless tap.
  useEffect(() => {
    if (!warehouseId && warehouses.data?.length === 1) setWarehouseId(warehouses.data[0]!.id);
  }, [warehouses.data, warehouseId]);

  const dock = useQuery({
    queryKey: ['receiving', 'dock', companyId, warehouseId],
    queryFn: () => api.receiving.dock(companyId, warehouseId),
    enabled: warehouseId !== null && receipt === null,
  });

  const queue = useQuery({
    queryKey: ['receiving', 'queue', companyId, receipt?.goodsReceiptId],
    queryFn: () => api.receiving.queue(companyId, receipt!.goodsReceiptId),
    enabled: session !== null && receipt !== null,
  });

  const start = useMutation({
    mutationFn: () => api.receiving.startSession(companyId, warehouseId!, 'mobile'),
    onSuccess: setSession,
    onError: (e: Error) => setMessage(e.message),
  });

  const close = useMutation({
    mutationFn: (s: ScannerSession) => api.receiving.closeSession(companyId, s),
    onSettled: () => {
      setSession(null);
      setReceipt(null);
      setMessage(null);
      setLastScan(null);
    },
  });

  const submit = useMutation({
    mutationFn: async ({ task, raw, symbology }: { task: ReceivingTask; raw: string; symbology: string }) => {
      if (!session) throw new Error('No scanner session');
      await api.receiving.submitScan(companyId, {
        session,
        claimId: task.taskId,
        taskId: task.taskId,
        taskType: 'receiving',
        taskRowVersion: task.receiptRowVersion,
        expectedRequirementId: task.purchaseOrderVersionLineId,
        rawValue: raw,
        symbology,
        inputMethod: 'scan',
        idempotencyKey: Crypto.randomUUID(),
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['receiving', 'queue'] });
      setMessage(null);
    },
    onError: (e: Error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage(e.message);
    },
  });

  const onBarcode = useCallback(
    async ({ data, type }: { data: string; type: string }) => {
      if (busy.current) return;
      busy.current = true;
      setScanning(false);
      setLastScan(data);
      try {
        const tasks = queue.data ?? [];
        const task = tasks.find((t) => t.isEligible && t.remainingBaseQuantity > 0) ?? tasks[0];
        if (!task) {
          setMessage('Nothing left to receive on this delivery.');
          return;
        }
        await submit.mutateAsync({ task, raw: data, symbology: type });
      } finally {
        busy.current = false;
      }
    },
    [queue.data, submit]
  );

  // ---- Camera ------------------------------------------------------------
  if (scanning) return <ScannerOverlay onBarcode={onBarcode} onCancel={() => setScanning(false)} />;

  // ---- Step 1: where are you? -------------------------------------------
  if (warehouseId === null) {
    return (
      <StepScreen title="Where are you receiving?" step="Step 1 of 3">
        {warehouses.isPending ? (
          <Loading label="Loading warehouses" />
        ) : warehouses.isLoadingError ? (
          <ErrorState message={(warehouses.error as Error).message} onRetry={() => warehouses.refetch()} />
        ) : warehouses.data.length === 0 ? (
          <EmptyState
            title="No receiving warehouses"
            hint="Your account has no warehouse configured for receiving. An administrator sets this in the ERP."
          />
        ) : (
          <Group>
            {warehouses.data.map((w) => (
              <ListRow
                key={w.id}
                icon="home"
                title={w.name}
                subtitle={w.code}
                onPress={() => setWarehouseId(w.id)}
              />
            ))}
          </Group>
        )}
      </StepScreen>
    );
  }

  // ---- Step 2: which delivery? ------------------------------------------
  if (receipt === null) {
    return (
      <StepScreen
        title="Which delivery?"
        step="Step 2 of 3"
        onBack={warehouses.data && warehouses.data.length > 1 ? () => setWarehouseId(null) : undefined}
        refreshing={dock.isRefetching}
        onRefresh={() => dock.refetch()}
      >
        {dock.isRefetchError ? <StaleBanner updatedAt={dock.dataUpdatedAt} /> : null}
        {dock.isPending ? (
          <Loading label="Loading the dock" />
        ) : dock.isLoadingError ? (
          <ErrorState message={(dock.error as Error).message} onRetry={() => dock.refetch()} />
        ) : dock.data.length === 0 ? (
          <EmptyState
            title="Nothing on the dock"
            hint="Deliveries appear here once they are checked in. Pull down to refresh."
          />
        ) : (
          <Group>
            {dock.data.map((r) => (
              <ListRow
                key={r.goodsReceiptId}
                icon="package"
                title={`${r.documentNumber} · ${r.vendorName}`}
                subtitle={[
                  r.purchaseOrderNumber,
                  r.openLineCount === null ? null : `${r.openLineCount} open`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                trailing={<StatusPill status={r.status === 'in_progress' ? 'partial' : 'open'} />}
                onPress={() => {
                  setReceipt(r);
                  setMessage(null);
                }}
              />
            ))}
          </Group>
        )}
        <Group>
          <ListRow
            icon="file-text"
            title="Delivery documents"
            subtitle="Review supplier paperwork the system has read"
            onPress={() => router.push('/(app)/receiving/documents')}
          />
        </Group>
      </StepScreen>
    );
  }

  // ---- Step 3: scan ------------------------------------------------------
  if (!session) {
    return (
      <StepScreen title="Start scanning" step="Step 3 of 3" onBack={() => setReceipt(null)}>
        <Card className="p-4">
          <Text className="text-base font-bold text-ink">{receipt.documentNumber}</Text>
          <Text className="mt-1 text-sm text-ink-muted">
            {receipt.vendorName}
            {receipt.purchaseOrderNumber ? ` · ${receipt.purchaseOrderNumber}` : ''}
          </Text>
        </Card>
        <NoticeCard
          tone="tip"
          title="Why a session"
          body="Scans are recorded against a claimed session, so a lost connection never loses a count and nothing is received twice."
        />
        {message ? <Text className="text-sm text-danger">{message}</Text> : null}
        <Button label="Start scanner session" onPress={() => start.mutate()} loading={start.isPending} />
      </StepScreen>
    );
  }

  return (
    <ScanQueue
      receipt={receipt}
      queue={queue}
      message={message}
      lastScan={lastScan}
      submitting={submit.isPending}
      onScan={() => setScanning(true)}
      onEnd={() => close.mutate(session)}
      ending={close.isPending}
    />
  );
}

/* ------------------------------------------------------------------ views */

function StepScreen({
  title,
  step,
  children,
  onBack,
  refreshing,
  onRefresh,
}: {
  title: string;
  step: string;
  children: React.ReactNode;
  onBack?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <FlatList
          data={[0]}
          keyExtractor={() => 'body'}
          contentContainerClassName="gap-4 px-5 pb-10 pt-2"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} /> : undefined
          }
          renderItem={() => (
            <View className="gap-4">
              <View className="gap-1">
                <GroupLabel label={step} />
                <Text className="text-3xl font-bold text-ink">{title}</Text>
              </View>
              {children}
              {onBack ? <Button label="Back" variant="ghost" onPress={onBack} /> : null}
            </View>
          )}
        />
      </SafeAreaView>
    </Screen>
  );
}

function ScanQueue({
  receipt,
  queue,
  message,
  lastScan,
  submitting,
  onScan,
  onEnd,
  ending,
}: {
  receipt: DockReceipt;
  queue: {
    isPending: boolean;
    isError: boolean;
    isLoadingError: boolean;
    isRefetchError: boolean;
    dataUpdatedAt: number;
    error: unknown;
    data?: ReceivingTask[];
    refetch: () => void;
  };
  message: string | null;
  lastScan: string | null;
  submitting: boolean;
  onScan: () => void;
  onEnd: () => void;
  ending: boolean;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const remaining = (queue.data ?? []).filter((t) => t.remainingBaseQuantity > 0).length;

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="gap-1 px-5 pb-3 pt-2">
          <Text className="text-2xl font-bold text-ink">{receipt.documentNumber}</Text>
          <Text className="text-sm text-ink-muted">
            {receipt.vendorName} · {remaining} line{remaining === 1 ? '' : 's'} open
          </Text>
        </View>

        {queue.isRefetchError ? <StaleBanner updatedAt={queue.dataUpdatedAt} /> : null}
        {queue.isPending ? (
          <Loading label="Loading receiving queue" />
        ) : queue.isLoadingError ? (
          <ErrorState message={(queue.error as Error).message} onRetry={queue.refetch} />
        ) : (
          <FlatList
            data={queue.data}
            keyExtractor={(t) => t.taskId}
            contentContainerClassName="gap-3 px-5 pb-4"
            ListEmptyComponent={<EmptyState title="Queue is empty" hint="Nothing is waiting on this delivery." />}
            renderItem={({ item }) => <TaskRow task={item} />}
          />
        )}

        <View className="gap-2 px-5 pb-4">
          {lastScan ? <Text className="text-xs text-ink-muted">Last scan: {lastScan}</Text> : null}
          {message ? <Text className="text-sm text-danger">{message}</Text> : null}
          {permission?.granted ? (
            <Button label="Scan a case" icon="maximize" onPress={onScan} loading={submitting} />
          ) : (
            <Button label="Allow camera" icon="camera" onPress={() => void requestPermission()} />
          )}
          <Button label="End session" variant="ghost" onPress={onEnd} loading={ending} />
        </View>
      </SafeAreaView>
    </Screen>
  );
}

function ScannerOverlay({
  onBarcode,
  onCancel,
}: {
  onBarcode: (result: { data: string; type: string }) => void;
  onCancel: () => void;
}) {
  return (
    <Screen>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'],
        }}
        onBarcodeScanned={onBarcode}
      >
        <SafeAreaView className="flex-1 justify-end p-6">
          <View className="rounded-2xl bg-black/70 p-4">
            <Text className="text-center text-sm text-white">Point the camera at the case barcode</Text>
            <View className="mt-3">
              <Button label="Cancel" variant="ghost" onPress={onCancel} />
            </View>
          </View>
        </SafeAreaView>
      </CameraView>
    </Screen>
  );
}

function TaskRow({ task }: { task: ReceivingTask }) {
  const done = task.remainingBaseQuantity <= 0;
  return (
    <View className={`rounded-2xl border border-surface-line bg-surface-card p-4 ${done ? 'opacity-60' : ''}`}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-xs font-medium text-ink-muted">
            Line {task.lineNumber} · {task.productSku}
          </Text>
          <Text className="text-base font-semibold text-ink" numberOfLines={2}>
            {task.productName}
          </Text>
        </View>
        <StatusPill status={done ? 'ok' : 'low'} label={done ? 'Complete' : 'Open'} />
      </View>

      <Text className="mt-3 text-sm text-ink">
        {task.priorReceivedBaseQuantity} of {task.orderedBaseQuantity} {task.uomCode} received
        {task.remainingBaseQuantity > 0 ? ` · ${task.remainingBaseQuantity} left` : ''}
      </Text>

      {task.blockerCode ? <Text className="mt-1 text-xs text-warn">Blocked: {task.blockerCode}</Text> : null}

      <View className="mt-2 flex-row flex-wrap gap-2">
        {task.tracksLots ? <Flag label="Lot" /> : null}
        {task.tracksExpiry ? <Flag label="Expiry" /> : null}
        {task.catchWeight ? <Flag label="Catch weight" /> : null}
        {task.temperatureRequired ? <Flag label="Temp" /> : null}
      </View>
    </View>
  );
}

function Flag({ label }: { label: string }) {
  return (
    <View className="rounded-md bg-brand-tint px-2 py-0.5">
      <Text className="text-[10px] font-semibold uppercase text-brand">{label}</Text>
    </View>
  );
}
