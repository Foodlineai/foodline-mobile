import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '../../components/primitives';
import { Button } from '../../components/ui';
import { colors, radius, space, type as typeScale } from '../../theme/tokens';
import type { ItemsFilter, StockItem } from './types';

/**
 * Screen 09 — Items.
 *
 * Two corrections from the 18 Sep review are structural here, not cosmetic:
 *
 *   1. Pack size lives in its own column. It used to be buried in the product
 *      name, which truncated on a phone and left customers reading half a spec.
 *   2. Every item declares Case or Catch weight. A distributor billing catch
 *      weight against a case count is a real invoicing dispute, so the
 *      distinction is on the row, not two taps away.
 *
 * FlatList rather than ScrollView: a real catalog is thousands of rows, and this
 * screen is opened on a handheld in a cold room.
 */

export type ItemsScreenProps = {
  items: StockItem[];
  filters: ItemsFilter[];
  activeFilterId: string;
  onFilterChange: (id: string) => void;
  onOpenItem: (item: StockItem) => void;
  onOpenCycleCounts: () => void;
  /** Null while loading; an empty array genuinely means no matches. */
  loading?: boolean;
};

export function ItemsScreen({
  items,
  filters,
  activeFilterId,
  onFilterChange,
  onOpenItem,
  onOpenCycleCounts,
  loading = false,
}: ItemsScreenProps) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.packSize.toLowerCase().includes(q) ||
        (i.location?.toLowerCase().includes(q) ?? false),
    );
  }, [items, query]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Button label="Cycle counts" icon="check-square" variant="ghost" onPress={onOpenCycleCounts} />
        <View style={styles.search}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find item, lot or bin"
            placeholderTextColor={colors.ink.disabled}
            style={styles.searchInput}
            accessibilityLabel="Find item, lot or bin"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        <View style={styles.filters}>
          {filters.map((f) => {
            const on = f.id === activeFilterId;
            return (
              <Pressable
                key={f.id}
                onPress={() => onFilterChange(f.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Card>
            <Text style={styles.empty}>
              {loading
                ? 'Loading items…'
                : query
                  ? `Nothing matches “${query}”.`
                  : 'No items in this view.'}
            </Text>
          </Card>
        }
        renderItem={({ item, index }) => (
          <ItemRow item={item} first={index === 0} onPress={() => onOpenItem(item)} />
        )}
      />
    </View>
  );
}

function ItemRow({
  item,
  first,
  onPress,
}: {
  item: StockItem;
  first: boolean;
  onPress: () => void;
}) {
  const tinted = item.flag === 'expiring';
  const critical = item.flag === 'below-par';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.packSize}, ${
        item.uom === 'case' ? 'case' : 'catch weight'
      }, ${item.onHand} on hand, ${item.availableLabel}`}
      style={[styles.row, !first && styles.rowDivided, tinted && styles.rowWarn]}
    >
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>

        <View style={styles.tags}>
          <Text style={styles.pack}>{item.packSize}</Text>
          <Tag
            label={item.uom === 'case' ? 'Case' : 'Catch weight'}
            fg={item.uom === 'case' ? colors.info.DEFAULT : colors.ok.DEFAULT}
            bg={item.uom === 'case' ? colors.info.tint : colors.ok.tint}
            line={item.uom === 'case' ? colors.info.line : colors.ok.line}
          />
          {item.expiryLabel && (
            <Tag
              label={item.expiryLabel}
              fg={colors.warn.ink}
              bg={colors.warn.tint}
              line={colors.warn.line}
            />
          )}
        </View>

        {item.location && <Text style={styles.location}>{item.location}</Text>}
      </View>

      <View style={styles.figures}>
        <Text style={[styles.onHand, critical && { color: colors.danger.DEFAULT }]}>
          {item.onHand}
        </Text>
        <Text style={[styles.available, critical && { color: colors.danger.DEFAULT }]}>
          {item.availableLabel}
        </Text>
      </View>
    </Pressable>
  );
}

function Tag({ label, fg, bg, line }: { label: string; fg: string; bg: string; line: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg, borderColor: line }]}>
      <Text style={[styles.tagText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },

  header: { paddingHorizontal: space.screen, paddingTop: 14, gap: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radius.input,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
  },
  searchGlyph: { fontSize: 16, color: colors.ink.subtle },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink.DEFAULT },

  filters: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
    backgroundColor: colors.surface.card,
  },
  chipOn: { backgroundColor: colors.brand.pressed, borderColor: colors.brand.pressed },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.ink.muted },
  chipTextOn: { color: '#FFFFFF' },

  list: { padding: space.screen, gap: 0, paddingBottom: 40 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.gap,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
    minHeight: space.tap + 20,
  },
  rowDivided: { borderTopWidth: 0 },
  rowWarn: { backgroundColor: colors.warn.tint },

  rowText: { flex: 1, minWidth: 0 },
  name: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, flexWrap: 'wrap' },
  pack: {
    fontSize: 11,
    color: colors.ink.muted,
    fontVariant: ['tabular-nums'],
  },
  location: { fontSize: 11, color: colors.ink.subtle, marginTop: 4 },

  tag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },

  figures: { alignItems: 'flex-end' },
  onHand: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink.DEFAULT,
    fontVariant: ['tabular-nums'],
  },
  available: { fontSize: 11, color: colors.ink.subtle, marginTop: 2 },

  empty: { ...typeScale.small, color: colors.ink.subtle, textAlign: 'center' },
});
