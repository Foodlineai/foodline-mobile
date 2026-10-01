import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FoodlineButton } from '../../../components/FoodlineButton';
import { Card, CardRow, Mono } from '../../../components/primitives';
import { colors, radius, space, type as typeScale } from '../../../theme/tokens';
import type { SalesOrderDetail } from '../order-detail/types';

export type ShortLine = {
  salesOrderLineId: string;
  itemLabel: string;
  sku: string;
  uomCode: string;
  backorderedBaseQuantity: string;
};

export type ResolveShortScreenProps = {
  order: SalesOrderDetail;
  shortLines: ShortLine[];
  /** True while that specific line's allocate call is in flight. */
  allocatingLineId: string | null;
  onAllocateLine: (line: ShortLine) => void;
  cancelling: boolean;
  cancelError: string | null;
  onCancelRemainder: (reason: string) => void;
};

/**
 * Resolve a short — build-brief Priority 1's `sales-order/[id]/short.tsx`.
 *
 * Two real actions, not the three the brief described:
 * - **Allocate available stock**, per line — `release_current_backorder`.
 *   This is the "stock showed up, ship what we can now" action; nothing
 *   needs to be called to *put* a line into backordered state — it's simply
 *   whatever remaining demand has no reservation.
 * - **Cancel the remaining quantity**, for the whole order at once —
 *   `cancel_current_sales_order_remainder` is order-wide, not per-line
 *   (confirmed against the live ERP source 1 Oct: its signature has no line
 *   id). A reason is required by the RPC itself.
 *
 * No "substitute" action: no RPC for it exists. Left out rather than
 * invented — see the port's own comment in `lib/api/ports.ts`.
 */
export function ResolveShortScreen({
  order,
  shortLines,
  allocatingLineId,
  onAllocateLine,
  cancelling,
  cancelError,
  onCancelRemainder,
}: ResolveShortScreenProps) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Mono>{order.documentNumber}</Mono>
        <Text style={styles.subtitle}>{order.customer.name}</Text>
      </View>

      <Card padded={false}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Short lines</Text>
        </View>
        {shortLines.map((line, i) => (
          <CardRow key={line.salesOrderLineId} first={i === 0}>
            <View style={styles.itemText}>
              <Text style={styles.itemName} numberOfLines={1}>
                {line.itemLabel}
              </Text>
              <Text style={styles.itemMeta}>
                {line.backorderedBaseQuantity} {line.uomCode} short
              </Text>
            </View>
            <FoodlineButton
              label="Allocate stock"
              busy={allocatingLineId === line.salesOrderLineId}
              onPress={() => onAllocateLine(line)}
            />
          </CardRow>
        ))}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Cancel the remainder</Text>
        <Text style={styles.helperText}>
          Cancels every short line on this order at once — there is no per-line cancel.
        </Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason (required)"
          placeholderTextColor={colors.ink.disabled}
          style={styles.input}
          multiline
        />
        {cancelError ? <Text style={styles.error}>{cancelError}</Text> : null}
        <FoodlineButton
          label="Cancel remaining quantity"
          variant="danger"
          busy={cancelling}
          disabled={trimmed.length === 0}
          onPress={() => onCancelRemainder(trimmed)}
        />
      </Card>

      <Text style={styles.note}>Substitute isn&apos;t available yet — no backend action exists for it.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gap, paddingBottom: 40 },

  subtitle: { ...typeScale.body, color: colors.ink.subtle, marginTop: 4 },

  itemText: { flex: 1, minWidth: 0, marginRight: 10 },
  itemName: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  itemMeta: { ...typeScale.small, color: colors.ink.subtle, marginTop: 2 },

  sectionHead: { paddingHorizontal: space.row, paddingTop: 13, paddingBottom: 4 },
  sectionTitle: { ...typeScale.section, color: colors.ink.DEFAULT },

  helperText: { ...typeScale.small, color: colors.ink.subtle, marginTop: 4, marginBottom: 10 },
  input: {
    minHeight: space.tap,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
    backgroundColor: colors.surface.card,
    fontSize: 14,
    color: colors.ink.DEFAULT,
    marginBottom: 10,
  },
  error: { ...typeScale.small, color: colors.danger.DEFAULT, marginBottom: 10 },

  note: { ...typeScale.small, color: colors.ink.subtle, textAlign: 'center' },
});
