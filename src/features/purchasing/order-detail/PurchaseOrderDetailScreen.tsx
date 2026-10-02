import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, CardRow, Mono, StatusPill } from '../../../components/primitives';
import { colors, space, type as typeScale } from '../../../theme/tokens';
import type { PurchaseOrderDetail } from './types';

export type PurchaseOrderDetailScreenProps = {
  order: PurchaseOrderDetail;
  onOpenVendor?: () => void;
};

export function PurchaseOrderDetailScreen({ order, onOpenVendor }: PurchaseOrderDetailScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Mono>{order.documentNumber}</Mono>
        <View style={styles.pills}>
          <StatusPill label={order.status.label} tone={order.status.tone} />
        </View>
      </View>

      <Card padded={false}>
        <CardRow first>
          <View style={styles.itemText}>
            <Text style={styles.label}>Vendor</Text>
            <Pressable disabled={!onOpenVendor} onPress={onOpenVendor} accessibilityRole={onOpenVendor ? 'button' : undefined}>
              <Text style={[styles.value, onOpenVendor && styles.link]} numberOfLines={1}>
                {order.vendor.name}
              </Text>
            </Pressable>
          </View>
        </CardRow>
        {order.warehouseName && (
          <CardRow>
            <View style={styles.itemText}>
              <Text style={styles.label}>Warehouse</Text>
              <Text style={styles.value}>{order.warehouseName}</Text>
            </View>
          </CardRow>
        )}
        <CardRow>
          <View style={styles.itemText}>
            <Text style={styles.label}>Order date</Text>
            <Text style={styles.value}>{order.orderDate ?? '—'}</Text>
          </View>
          <View style={styles.itemText}>
            <Text style={styles.label}>Expected</Text>
            <Text style={styles.value}>{order.expectedDeliveryDate ?? '—'}</Text>
          </View>
        </CardRow>
        <CardRow>
          <View style={styles.itemText}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.value}>{order.canReadCost ? (order.total ?? '—') : 'Hidden'}</Text>
          </View>
        </CardRow>
      </Card>

      <Card padded={false}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Lines</Text>
          <Text style={styles.sectionNote}>{order.lineCount}</Text>
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
                  {line.productName}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {line.productSku ? `${line.productSku} · ` : ''}
                  {line.quantity} {line.uomCode}
                </Text>
              </View>
              <Text style={styles.orderTotal}>{order.canReadCost ? (line.totalAmount ?? '—') : '—'}</Text>
            </CardRow>
          ))
        )}
      </Card>

      {order.notes && (
        <Card>
          <Text style={styles.label}>Notes</Text>
          <Text style={styles.value}>{order.notes}</Text>
        </Card>
      )}
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
