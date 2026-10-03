import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, StatusPill } from '@/components/primitives';
import { colors, radius, space, type as typeScale } from '@/theme/tokens';
import type { VendorListItem } from './types';

type StatusFilter = 'all' | VendorListItem['status'];

export function VendorDirectoryScreen({
  vendors,
  onOpenVendor,
}: {
  vendors: VendorListItem[];
  onOpenVendor: (vendor: VendorListItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vendors.filter((vendor) => {
      if (status !== 'all' && vendor.status !== status) return false;
      if (!needle) return true;
      return [vendor.name, vendor.code, vendor.category, vendor.orderEmail, vendor.phone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [query, status, vendors]);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'on-hold', label: 'On hold' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Vendors</Text>
        <Text style={styles.subtitle}>Live supplier directory for this company</Text>
        <View style={styles.search}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find vendor, code or category"
            placeholderTextColor={colors.ink.disabled}
            style={styles.searchInput}
            accessibilityLabel="Find vendor, code or category"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        <View style={styles.filters}>
          {filters.map((filter) => {
            const selected = filter.key === status;
            const count =
              filter.key === 'all'
                ? vendors.length
                : vendors.filter((vendor) => vendor.status === filter.key).length;
            return (
              <Pressable
                key={filter.key}
                onPress={() => setStatus(filter.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.filter, selected && styles.filterSelected]}
              >
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                  {filter.label} {count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(vendor) => vendor.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card>
            <Text style={styles.empty}>
              {query ? `No vendors match “${query}”.` : 'No vendors are available in this view.'}
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onOpenVendor(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.status}`}
            style={styles.row}
          >
            <View style={styles.rowBody}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[item.code, item.category].filter(Boolean).join(' · ')}
              </Text>
              {item.orderEmail ? (
                <Text style={styles.contact} numberOfLines={1}>
                  {item.orderEmail}
                </Text>
              ) : null}
            </View>
            <View style={styles.trailing}>
              <StatusPill
                label={item.status === 'on-hold' ? 'On hold' : item.status}
                tone={item.status === 'active' ? 'ok' : item.status === 'on-hold' ? 'warn' : 'neutral'}
              />
              {item.openOrderCount !== null ? (
                <Text style={styles.openOrders}>{item.openOrderCount} open PO{item.openOrderCount === 1 ? '' : 's'}</Text>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  header: { paddingHorizontal: space.screen, paddingTop: 18, gap: 10 },
  title: { ...typeScale.titleSm, color: colors.ink.DEFAULT },
  subtitle: { ...typeScale.small, color: colors.ink.subtle, marginTop: -6 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 9, height: 42, paddingHorizontal: 12,
    borderRadius: radius.input, backgroundColor: colors.surface.card, borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
  },
  searchGlyph: { fontSize: 16, color: colors.ink.subtle },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink.DEFAULT },
  filters: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  filter: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.hairline.DEFAULT, backgroundColor: colors.surface.card,
  },
  filterSelected: { backgroundColor: colors.brand.pressed, borderColor: colors.brand.pressed },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.ink.muted },
  filterTextSelected: { color: '#FFFFFF' },
  list: { padding: space.screen, gap: 8, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, padding: 14,
    borderRadius: radius.card, borderWidth: 1, borderColor: colors.hairline.DEFAULT,
    backgroundColor: colors.surface.card,
  },
  rowBody: { flex: 1, minWidth: 0 },
  name: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  meta: { ...typeScale.small, color: colors.ink.muted, marginTop: 3 },
  contact: { fontSize: 11, color: colors.ink.subtle, marginTop: 3 },
  trailing: { alignItems: 'flex-end', gap: 6 },
  openOrders: { fontSize: 11, color: colors.ink.subtle },
  empty: { ...typeScale.small, color: colors.ink.subtle, textAlign: 'center' },
});
