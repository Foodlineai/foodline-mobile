import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '../../components/primitives';
import { colors, radius, space, type as typeScale } from '../../theme/tokens';
import {
  visibleWorkspaces,
  type Persona,
  type WorkspaceId,
  type WorkspaceMeta,
} from '../../personas/types';

/**
 * The workspace directory, scoped to the persona.
 *
 * Three rules, and the third is the one that gets argued about:
 *
 *   1. A workspace the persona has no business in is **not shown**. Not greyed,
 *      not "request access" — absent. Eleven dead rows is how a warehouse worker
 *      decides the app is not for them.
 *   2. A workspace they can read but not act in is shown with a quiet "View"
 *      tag, so they know what they are getting before they tap.
 *   3. A workspace with no screen built yet shows **Coming soon** rather than
 *      being hidden. That is the opposite of rule 1 and it is deliberate: the
 *      demo should show the true shape of the product, and nothing should
 *      dead-end silently. Rule 1 is about permission; this is about progress.
 */

export type WorkspaceDirectoryScreenProps = {
  persona: Persona;
  /** Workspace ids that have a real screen. Everything else shows Coming soon. */
  built: WorkspaceId[];
  onOpen: (workspace: WorkspaceMeta) => void;
};

const GROUP_LABEL: Record<WorkspaceMeta['group'], string> = {
  operations: 'Operations',
  business: 'Business',
  administration: 'Administration',
};

export function WorkspaceDirectoryScreen({
  persona,
  built,
  onOpen,
}: WorkspaceDirectoryScreenProps) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = visibleWorkspaces(persona.id).filter(
      (r) => !q || r.workspace.label.toLowerCase().includes(q),
    );

    const out: { group: WorkspaceMeta['group']; rows: typeof rows }[] = [];
    for (const g of ['operations', 'business', 'administration'] as const) {
      const inGroup = rows.filter((r) => r.workspace.group === g);
      if (inGroup.length) out.push({ group: g, rows: inGroup });
    }
    return out;
  }, [persona.id, query]);

  const buildable = new Set(built);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>Your workspaces</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {persona.label} · {persona.scopeLabel}
          </Text>
        </View>
      </View>

      <View style={styles.search}>
        <Text style={styles.searchGlyph}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find a module or setting"
          placeholderTextColor={colors.ink.disabled}
          style={styles.searchInput}
          accessibilityLabel="Find a module or setting"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {grouped.length === 0 ? (
        <Card>
          <Text style={styles.empty}>Nothing matches “{query}”.</Text>
        </Card>
      ) : (
        grouped.map(({ group, rows }) => (
          <View key={group}>
            <Text style={styles.groupLabel}>{GROUP_LABEL[group]}</Text>
            <Card padded={false}>
              {rows.map(({ workspace, access }, i) => {
                const ready = buildable.has(workspace.id);
                return (
                  <Pressable
                    key={workspace.id}
                    onPress={() => ready && onOpen(workspace)}
                    disabled={!ready}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !ready }}
                    accessibilityLabel={
                      ready
                        ? `${workspace.label}${access === 'read' ? ', view only' : ''}`
                        : `${workspace.label}, coming soon`
                    }
                    style={[styles.row, i > 0 && styles.rowDivided]}
                  >
                    <Text style={[styles.rowLabel, !ready && styles.rowLabelMuted]}>
                      {workspace.label}
                    </Text>

                    {!ready ? (
                      <Text style={styles.soon}>Coming soon</Text>
                    ) : access === 'read' ? (
                      <View style={styles.viewTag}>
                        <Text style={styles.viewTagText}>View</Text>
                      </View>
                    ) : null}

                    {ready && <Text style={styles.chevron}>›</Text>}
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ))
      )}

      <Text style={styles.foot}>
        You are seeing the workspaces for {persona.label}. Ask an admin if something you need is
        missing.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gap, paddingBottom: 40 },

  title: { ...typeScale.titleSm, color: colors.ink.DEFAULT },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.tint,
    borderWidth: 1,
    borderColor: colors.info.line,
  },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.brand.pressed },

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

  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink.subtle,
    marginBottom: 6,
    marginTop: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space.row,
    minHeight: 48,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: colors.hairline.soft },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.ink.DEFAULT },
  rowLabelMuted: { color: colors.ink.disabled },

  viewTag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.tint,
    borderWidth: 1,
    borderColor: colors.info.line,
  },
  viewTagText: { fontSize: 11, fontWeight: '600', color: colors.brand.pressed },
  soon: { fontSize: 11, fontWeight: '600', color: colors.ink.disabled },
  chevron: { fontSize: 20, color: colors.ink.disabled, marginTop: -2 },

  empty: { ...typeScale.small, color: colors.ink.subtle, textAlign: 'center' },
  foot: { ...typeScale.small, color: colors.ink.subtle, textAlign: 'center', marginTop: 4 },
});
