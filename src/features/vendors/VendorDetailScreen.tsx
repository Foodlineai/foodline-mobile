import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, CardRow, StatusPill } from '../../components/primitives';
import { colors, space, type as typeScale } from '../../theme/tokens';
import type { VendorDetail } from './types';

export type VendorDetailScreenProps = {
  vendor: VendorDetail;
};

export function VendorDetailScreen({ vendor }: VendorDetailScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.name}>{vendor.name}</Text>
        <View style={styles.pills}>
          <StatusPill label={vendor.status} tone={vendor.status === 'active' ? 'ok' : 'neutral'} />
          {vendor.code ? <StatusPill label={vendor.code} tone="info" /> : null}
        </View>
      </View>

      <Card padded={false}>
        <CardRow first>
          <View style={styles.itemText}>
            <Text style={styles.label}>Terms</Text>
            <Text style={styles.value}>{vendor.paymentTermCode ?? '—'}</Text>
          </View>
          <View style={styles.itemText}>
            <Text style={styles.label}>Lead time</Text>
            <Text style={styles.value}>{vendor.leadDays !== null ? `${vendor.leadDays}d` : '—'}</Text>
          </View>
        </CardRow>
        <CardRow>
          <View style={styles.itemText}>
            <Text style={styles.label}>Order email</Text>
            <Text style={styles.value} numberOfLines={1}>
              {vendor.contact.email ?? '—'}
            </Text>
          </View>
          <View style={styles.itemText}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{vendor.contact.phone ?? '—'}</Text>
          </View>
        </CardRow>
        {vendor.minimumOrderAmount && (
          <CardRow>
            <View style={styles.itemText}>
              <Text style={styles.label}>Minimum order</Text>
              <Text style={styles.value}>{vendor.minimumOrderAmount}</Text>
            </View>
          </CardRow>
        )}
        {!vendor.hasOperatingProfile && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No operating profile configured for this vendor yet.</Text>
          </View>
        )}
      </Card>

      <Card padded={false}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Open purchase orders</Text>
        </View>
        <CardRow first>
          <View style={styles.itemText}>
            <Text style={styles.label}>Open count</Text>
            <Text style={styles.value}>{vendor.openOrderCount}</Text>
          </View>
          <View style={styles.itemText}>
            <Text style={styles.label}>Exposure</Text>
            <Text style={styles.value}>
              {vendor.canReadCost
                ? vendor.openAmounts.length > 0
                  ? vendor.openAmounts.map((a) => a.value).join(', ')
                  : '—'
                : 'Hidden'}
            </Text>
          </View>
        </CardRow>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gap, paddingBottom: 40 },

  name: { ...typeScale.titleSm, color: colors.ink.DEFAULT },
  pills: { flexDirection: 'row', gap: 7, marginTop: 7, flexWrap: 'wrap' },

  itemText: { flex: 1, minWidth: 0 },
  label: { fontSize: 11, color: colors.ink.subtle },
  value: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT, marginTop: 2 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: space.row,
    paddingTop: 13,
    paddingBottom: 4,
  },
  sectionTitle: { ...typeScale.section, color: colors.ink.DEFAULT },

  empty: { paddingHorizontal: space.row, paddingVertical: 14 },
  emptyText: { ...typeScale.small, color: colors.ink.subtle },
});
