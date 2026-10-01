import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoodlineButton } from '../../../components/FoodlineButton';
import { Card, CardRow, Mono, StatusPill } from '../../../components/primitives';
import { colors, space, type as typeScale } from '../../../theme/tokens';
import type { SalesOrderDetail } from './types';

export type SalesOrderDetailScreenProps = {
  order: SalesOrderDetail;
  onOpenCustomer?: () => void;
  onResolveShort?: () => void;
};

export function SalesOrderDetailScreen({ order, onOpenCustomer, onResolveShort }: SalesOrderDetailScreenProps) {
  const hasShort = order.lines.some((l) => Number(l.backorderedBaseQuantity ?? '0') > 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Mono>{order.documentNumber}</Mono>
        <View style={styles.pills}>
          <StatusPill label={order.orderStatus.label} tone={order.orderStatus.tone} />
          <StatusPill label={order.shipmentStatus} tone="neutral" />
          <StatusPill label={order.invoiceStatus} tone="neutral" />
        </View>
      </View>

      <Card padded={false}>
        <CardRow first>
          <View style={styles.itemText}>
            <Text style={styles.label}>Customer</Text>
            <Pressable disabled={!onOpenCustomer} onPress={onOpenCustomer} accessibilityRole={onOpenCustomer ? 'button' : undefined}>
              <Text style={[styles.value, onOpenCustomer && styles.link]} numberOfLines={1}>
                {order.customer.name}
              </Text>
            </Pressable>
          </View>
        </CardRow>
        <CardRow>
          <View style={styles.itemText}>
            <Text style={styles.label}>Order date</Text>
            <Text style={styles.value}>{order.orderDate ?? '—'}</Text>
          </View>
          <View style={styles.itemText}>
            <Text style={styles.label}>Requested for</Text>
            <Text style={styles.value}>{order.requestedDeliveryDate ?? '—'}</Text>
          </View>
        </CardRow>
        <CardRow>
          <View style={styles.itemText}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.value}>{order.total ?? '—'}</Text>
          </View>
        </CardRow>
      </Card>

      <Card padded={false}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Lines</Text>
          <Text style={styles.sectionNote}>{order.lines.length}</Text>
        </View>
        {order.lines.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No lines on this order.</Text>
          </View>
        ) : (
          order.lines.map((line, i) => (
            <CardRow key={line.id} first={i === 0}>
              <View style={styles.itemText}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {line.itemLabel}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {line.sku ? `${line.sku} · ` : ''}
                  {line.orderedQuantity} {line.uomCode} ordered · {line.shippedBaseQuantity} shipped
                  {line.backorderedBaseQuantity && Number(line.backorderedBaseQuantity) > 0
                    ? ` · ${line.backorderedBaseQuantity} short`
                    : ''}
                </Text>
              </View>
              <Text style={styles.orderTotal}>{line.totalAmount ?? '—'}</Text>
            </CardRow>
          ))
        )}
      </Card>

      {hasShort && onResolveShort ? (
        <FoodlineButton label="Resolve the short" onPress={onResolveShort} testID="sales-order-resolve-short" />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gap, paddingBottom: 40 },

  pills: { flexDirection: 'row', gap: 7, marginTop: 7, flexWrap: 'wrap' },

  itemText: { flex: 1, minWidth: 0 },
  label: { fontSize: 11, color: colors.ink.subtle },
  value: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT, marginTop: 2 },
  link: { color: colors.info.DEFAULT, textDecorationLine: 'underline' },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: space.row,
    paddingTop: 13,
    paddingBottom: 4,
  },
  sectionTitle: { ...typeScale.section, color: colors.ink.DEFAULT },
  sectionNote: { fontSize: 11, color: colors.ink.subtle },

  itemName: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  itemMeta: { ...typeScale.small, color: colors.ink.subtle, marginTop: 2 },
  orderTotal: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT, fontVariant: ['tabular-nums'] },

  empty: { paddingHorizontal: space.row, paddingBottom: 14 },
  emptyText: { ...typeScale.small, color: colors.ink.subtle },
});
