import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FoodlineButton } from '../../components/FoodlineButton';
import { Card, CardRow, Mono, StatusPill, StepProgress, type Step } from '../../components/primitives';
import { Attempt } from '../../actions/idempotency';
import { colors, radius, space, type as typeScale } from '../../theme/tokens';
import type { CatalogItem, DraftLine, NewPoDraft, VendorOption } from './types';

/**
 * P1 — New purchase order, end to end.
 *
 * This is the template every other create flow copies. The shape is
 * **entry → steps → commit → confirmation → somewhere real**, and the last two
 * are the ones usually skipped: a flow that commits and dumps you back on a list
 * gives no evidence it worked, so the user taps again and creates a duplicate.
 *
 * Four things here are deliberate and should survive a rewrite:
 *
 *  1. **Back never loses data.** The draft lives in one piece of state above the
 *     steps. Someone interrupted at step 3 by a phone call comes back to it.
 *  2. **One idempotency key per attempt**, created when the user commits, reused
 *     on every retry. Regenerating it on retry is what double-orders stock.
 *  3. **The running total is always visible** from the moment there is a line.
 *     A buyer who cannot see what they are about to spend will not tap commit.
 *  4. **Commit is disabled, not hidden, when the draft is incomplete** — with the
 *     reason on screen. A greyed button that says why is help; one that says
 *     nothing is a bug report.
 */

type Phase = 'vendor' | 'items' | 'review' | 'done';

const STEP_LABELS: Record<Exclude<Phase, 'done'>, string> = {
  vendor: 'Choose a vendor',
  items: 'Add items',
  review: 'Check and send',
};

export type NewPurchaseOrderFlowProps = {
  vendors: VendorOption[];
  /** Catalog for the chosen vendor. Refetched when the vendor changes. */
  catalogFor: (vendorId: string) => CatalogItem[];
  /** Resolves to the created PO's reference. Throws on failure. */
  onCommit: (draft: NewPoDraft, attempt: Attempt) => Promise<string>;
  onOpenPurchaseOrder: (reference: string) => void;
  onCancel: () => void;
};

export function NewPurchaseOrderFlow({
  vendors,
  catalogFor,
  onCommit,
  onOpenPurchaseOrder,
  onCancel,
}: NewPurchaseOrderFlowProps) {
  const [phase, setPhase] = useState<Phase>('vendor');
  const [vendor, setVendor] = useState<VendorOption | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [expectedDate, setExpectedDate] = useState('');
  const [note, setNote] = useState('');

  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  /**
   * Held across retries on purpose. If the network drops mid-commit, the retry
   * carries the same key and the server dedupes instead of creating a second PO.
   */
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [lines],
  );

  const steps: Step[] = (['vendor', 'items', 'review'] as const).map((p) => ({
    label: STEP_LABELS[p],
    state:
      phase === 'done'
        ? 'done'
        : p === phase
          ? 'active'
          : order(p) < order(phase)
            ? 'done'
            : 'pending',
  }));

  const blocker =
    !vendor
      ? 'Choose a vendor to continue.'
      : lines.length === 0
        ? 'Add at least one item.'
        : !expectedDate.trim()
          ? 'An expected delivery date is needed.'
          : null;

  async function commit() {
    if (blocker || !vendor) return;

    const thisAttempt = attempt ?? new Attempt('purchase-order.create');
    setAttempt(thisAttempt);
    setCommitting(true);
    setError(null);

    try {
      const reference = await onCommit(
        { vendorId: vendor.id, lines, expectedDate: expectedDate.trim(), note: note.trim() || null },
        thisAttempt,
      );
      thisAttempt.settle();
      setAttempt(null);
      setCreated(reference);
      setPhase('done');
    } catch (e) {
      // The attempt is deliberately kept so a retry reuses the same key.
      setError(
        e instanceof Error ? e.message : 'The purchase order could not be sent. Try again.',
      );
    } finally {
      setCommitting(false);
    }
  }

  if (phase === 'done' && created) {
    return (
      <Confirmation
        reference={created}
        vendorName={vendor?.name ?? ''}
        total={money(total)}
        expectedDate={expectedDate}
        onOpen={() => onOpenPurchaseOrder(created)}
        onAnother={() => {
          setPhase('vendor');
          setVendor(null);
          setLines([]);
          setExpectedDate('');
          setNote('');
          setCreated(null);
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.progress}>
        <StepProgress steps={steps} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {phase === 'vendor' && (
          <VendorStep
            vendors={vendors}
            selectedId={vendor?.id ?? null}
            onSelect={(v) => {
              // Changing vendor invalidates the lines — they are that vendor's catalog.
              if (v.id !== vendor?.id) setLines([]);
              setVendor(v);
              setPhase('items');
            }}
          />
        )}

        {phase === 'items' && vendor && (
          <ItemsStep
            catalog={catalogFor(vendor.id)}
            lines={lines}
            onChange={setLines}
          />
        )}

        {phase === 'review' && vendor && (
          <ReviewStep
            vendor={vendor}
            lines={lines}
            total={money(total)}
            expectedDate={expectedDate}
            onExpectedDate={setExpectedDate}
            note={note}
            onNote={setNote}
          />
        )}

        {error && (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>
              Retrying is safe — this order will not be sent twice.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {lines.length > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {lines.length} {lines.length === 1 ? 'line' : 'lines'}
            </Text>
            <Text style={styles.totalValue}>{money(total)}</Text>
          </View>
        )}

        {phase === 'review' && blocker && <Text style={styles.blocker}>{blocker}</Text>}

        <View style={styles.actions}>
          <FoodlineButton
            label={phase === 'review' ? 'Send purchase order' : 'Continue'}
            busy={committing}
            disabled={phase === 'review' ? blocker !== null : phase === 'items' && lines.length === 0}
            onPress={() => {
              if (phase === 'vendor' && vendor) setPhase('items');
              else if (phase === 'items') setPhase('review');
              else void commit();
            }}
            style={styles.grow}
            testID="po-primary"
          />
          <FoodlineButton
            label={phase === 'vendor' ? 'Cancel' : 'Back'}
            variant="quiet"
            disabled={committing}
            onPress={() => {
              if (phase === 'vendor') onCancel();
              else setPhase(phase === 'review' ? 'items' : 'vendor');
            }}
          />
        </View>
      </View>
    </View>
  );
}

/* ── Steps ─────────────────────────────────────────────────────────────── */

function VendorStep({
  vendors,
  selectedId,
  onSelect,
}: {
  vendors: VendorOption[];
  selectedId: string | null;
  onSelect: (v: VendorOption) => void;
}) {
  const [query, setQuery] = useState('');
  const shown = vendors.filter((v) => v.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <SearchField value={query} onChange={setQuery} placeholder="Search vendors" />
      <Card padded={false}>
        {shown.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No vendor matches “{query}”.</Text>
          </View>
        ) : (
          shown.map((v, i) => (
            <Pressable
              key={v.id}
              onPress={() => onSelect(v)}
              accessibilityRole="button"
              accessibilityState={{ selected: v.id === selectedId }}
            >
              <CardRow first={i === 0}>
                <View style={styles.grow}>
                  <Text style={styles.rowTitle}>{v.name}</Text>
                  <Text style={styles.rowMeta}>
                    {v.terms} · lead time {v.leadTimeDays} {v.leadTimeDays === 1 ? 'day' : 'days'}
                  </Text>
                </View>
                {v.id === selectedId && <StatusPill label="Chosen" tone="ok" />}
              </CardRow>
            </Pressable>
          ))
        )}
      </Card>
    </>
  );
}

function ItemsStep({
  catalog,
  lines,
  onChange,
}: {
  catalog: CatalogItem[];
  lines: DraftLine[];
  onChange: (next: DraftLine[]) => void;
}) {
  const [query, setQuery] = useState('');
  const shown = catalog.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  const qty = (id: string) => lines.find((l) => l.itemId === id)?.quantity ?? 0;

  function setQty(item: CatalogItem, next: number) {
    if (next <= 0) {
      onChange(lines.filter((l) => l.itemId !== item.id));
      return;
    }
    const existing = lines.find((l) => l.itemId === item.id);
    onChange(
      existing
        ? lines.map((l) => (l.itemId === item.id ? { ...l, quantity: next } : l))
        : [
            ...lines,
            {
              itemId: item.id,
              description: `${item.name} · ${item.packSize}`,
              quantity: next,
              unitPrice: item.unitPrice,
            },
          ],
    );
  }

  return (
    <>
      <SearchField value={query} onChange={setQuery} placeholder="Search this vendor's catalog" />
      <Card padded={false}>
        {shown.map((item, i) => {
          const q = qty(item.id);
          return (
            <CardRow key={item.id} first={i === 0}>
              <View style={styles.grow}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.packSize} · {money(item.unitPrice)} per {item.uom}
                </Text>
              </View>

              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setQty(item, q - 1)}
                  disabled={q === 0}
                  accessibilityLabel={`Remove one ${item.name}`}
                  style={[styles.stepBtn, q === 0 && styles.stepBtnOff]}
                >
                  <Text style={styles.stepGlyph}>−</Text>
                </Pressable>
                <Text style={styles.qty}>{q}</Text>
                <Pressable
                  onPress={() => setQty(item, q + 1)}
                  accessibilityLabel={`Add one ${item.name}`}
                  style={styles.stepBtn}
                >
                  <Text style={styles.stepGlyph}>+</Text>
                </Pressable>
              </View>
            </CardRow>
          );
        })}
      </Card>
    </>
  );
}

function ReviewStep({
  vendor,
  lines,
  total,
  expectedDate,
  onExpectedDate,
  note,
  onNote,
}: {
  vendor: VendorOption;
  lines: DraftLine[];
  total: string;
  expectedDate: string;
  onExpectedDate: (v: string) => void;
  note: string;
  onNote: (v: string) => void;
}) {
  return (
    <>
      <Card>
        <Text style={styles.rowTitle}>{vendor.name}</Text>
        <Text style={styles.rowMeta}>
          {vendor.terms} · lead time {vendor.leadTimeDays} days
        </Text>
      </Card>

      <Card padded={false}>
        {lines.map((l, i) => (
          <CardRow key={l.itemId} first={i === 0}>
            <Text style={[styles.rowTitle, styles.grow]} numberOfLines={1}>
              {l.description}
            </Text>
            <Text style={styles.lineQty}>{l.quantity}</Text>
            <Text style={styles.lineTotal}>{money(l.unitPrice * l.quantity)}</Text>
          </CardRow>
        ))}
        <CardRow>
          <Text style={[styles.rowTitle, styles.grow]}>Total</Text>
          <Text style={styles.lineTotal}>{total}</Text>
        </CardRow>
      </Card>

      <View>
        <Text style={styles.label}>Expected delivery date</Text>
        <TextInput
          value={expectedDate}
          onChangeText={onExpectedDate}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={colors.ink.disabled}
          style={styles.field}
          accessibilityLabel="Expected delivery date, required"
        />
      </View>

      <View>
        <Text style={styles.label}>Note for the vendor (optional)</Text>
        <TextInput
          value={note}
          onChangeText={onNote}
          placeholder="Anything they should know"
          placeholderTextColor={colors.ink.disabled}
          style={styles.field}
          accessibilityLabel="Note for the vendor, optional"
        />
      </View>
    </>
  );
}

function Confirmation({
  reference,
  vendorName,
  total,
  expectedDate,
  onOpen,
  onAnother,
}: {
  reference: string;
  vendorName: string;
  total: string;
  expectedDate: string;
  onOpen: () => void;
  onAnother: () => void;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.confirm}>
      <View style={styles.tick}>
        <Text style={styles.tickGlyph}>✓</Text>
      </View>

      <Text style={styles.confirmTitle}>Purchase order sent</Text>
      <Mono style={styles.confirmRef}>{reference}</Mono>

      <Card style={styles.confirmCard}>
        <View style={styles.confirmRow}>
          <Text style={styles.rowMeta}>Vendor</Text>
          <Text style={styles.rowTitle}>{vendorName}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={styles.rowMeta}>Total</Text>
          <Text style={styles.rowTitle}>{total}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={styles.rowMeta}>Expected</Text>
          <Text style={styles.rowTitle}>{expectedDate}</Text>
        </View>
      </Card>

      <FoodlineButton label="Open this purchase order" onPress={onOpen} style={styles.confirmBtn} />
      <FoodlineButton
        label="Create another"
        variant="quiet"
        onPress={onAnother}
        style={styles.confirmBtn}
      />
    </ScrollView>
  );
}

/* ── Bits ──────────────────────────────────────────────────────────────── */

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Text style={styles.searchGlyph}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.ink.disabled}
        style={styles.searchInput}
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const ORDER: Record<Exclude<Phase, 'done'>, number> = { vendor: 0, items: 1, review: 2 };
function order(p: Phase): number {
  return p === 'done' ? 3 : ORDER[p];
}

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  progress: { padding: space.screen, paddingBottom: 6 },
  content: { padding: space.screen, paddingTop: 6, gap: space.gap, paddingBottom: 24 },
  grow: { flex: 1, minWidth: 0 },

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

  rowTitle: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  rowMeta: { ...typeScale.small, color: colors.ink.subtle, marginTop: 2 },
  lineQty: {
    width: 36,
    textAlign: 'right',
    ...typeScale.bodyStrong,
    color: colors.ink.muted,
    fontVariant: ['tabular-nums'],
  },
  lineTotal: {
    width: 84,
    textAlign: 'right',
    ...typeScale.bodyStrong,
    color: colors.ink.DEFAULT,
    fontVariant: ['tabular-nums'],
  },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnOff: { opacity: 0.4 },
  stepGlyph: { fontSize: 18, color: colors.brand.pressed, marginTop: -2 },
  qty: {
    minWidth: 26,
    textAlign: 'center',
    ...typeScale.bodyStrong,
    fontVariant: ['tabular-nums'],
  },

  label: { fontSize: 12, fontWeight: '600', color: colors.ink.muted, marginBottom: 6 },
  field: {
    height: space.tap,
    paddingHorizontal: 13,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
    backgroundColor: colors.surface.card,
    fontSize: 14,
    color: colors.ink.DEFAULT,
  },

  footer: {
    padding: space.screen,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.hairline.DEFAULT,
    backgroundColor: colors.surface.card,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { ...typeScale.small, color: colors.ink.subtle },
  totalValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink.DEFAULT,
    fontVariant: ['tabular-nums'],
  },
  blocker: { ...typeScale.small, color: colors.warn.DEFAULT },
  actions: { flexDirection: 'row', gap: 10 },

  error: {
    padding: 13,
    borderRadius: radius.card,
    backgroundColor: colors.danger.tint,
    borderWidth: 1,
    borderColor: colors.danger.line,
  },
  errorText: { ...typeScale.small, color: colors.danger.DEFAULT, fontWeight: '600' },
  errorHint: { ...typeScale.small, color: colors.ink.muted, marginTop: 3 },

  empty: { padding: space.row },
  emptyText: { ...typeScale.small, color: colors.ink.subtle },

  confirm: { padding: space.screen, gap: 12, alignItems: 'center', paddingTop: 48 },
  tick: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.ok.tint,
    borderWidth: 1,
    borderColor: colors.ok.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickGlyph: { fontSize: 30, color: colors.ok.DEFAULT, fontWeight: '700' },
  confirmTitle: { ...typeScale.titleSm, color: colors.ink.DEFAULT, marginTop: 4 },
  confirmRef: { fontSize: 15 },
  confirmCard: { alignSelf: 'stretch', marginTop: 8 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  confirmBtn: { alignSelf: 'stretch' },
});
