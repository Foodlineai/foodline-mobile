import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Attempt } from '@/actions/idempotency';
import { FoodlineButton } from '@/components/FoodlineButton';
import { Card, CardRow, Mono, StatusPill, StepProgress, type Step } from '@/components/primitives';
import { colors, radius, space, type as typeScale } from '@/theme/tokens';
import type {
  CatalogItem,
  DraftLine,
  NewOrderCustomer,
  NewSalesOrderDraft,
  SalesOrderConfirmation,
} from './types';

type Phase = 'customer' | 'items' | 'review' | 'done';

const STEP_LABELS: Record<Exclude<Phase, 'done'>, string> = {
  customer: 'Choose a customer',
  items: 'Add items',
  review: 'Check and send',
};

export type NewSalesOrderFlowProps = {
  customers: NewOrderCustomer[];
  catalog: CatalogItem[];
  currencyCode: string;
  defaultDeliveryDate: string;
  minimumDeliveryDate: string;
  onQuote: (customer: NewOrderCustomer, item: CatalogItem, quantity: number) => Promise<DraftLine>;
  onCommit: (draft: NewSalesOrderDraft, attempt: Attempt) => Promise<SalesOrderConfirmation>;
  onOpenSalesOrder: (id: string) => void;
  onCancel: () => void;
};

export function NewSalesOrderFlow(props: NewSalesOrderFlowProps) {
  const [phase, setPhase] = useState<Phase>('customer');
  const [customer, setCustomer] = useState<NewOrderCustomer | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [requestedDate, setRequestedDate] = useState(props.defaultDeliveryDate);
  const [customerPo, setCustomerPo] = useState('');
  const [quoting, setQuoting] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SalesOrderConfirmation | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const quoteSequence = useRef(new Map<string, number>());

  const total = useMemo(() => addMoney(lines.map((line) => line.extendedAmount)), [lines]);
  const steps: Step[] = (['customer', 'items', 'review'] as const).map((step) => ({
    label: STEP_LABELS[step],
    state:
      phase === 'done' ? 'done' : step === phase ? 'active' : order(step) < order(phase) ? 'done' : 'pending',
  }));
  const dateValid = isIsoDate(requestedDate) && requestedDate >= props.minimumDeliveryDate;
  const blocker = !customer
    ? 'Choose an eligible customer.'
    : lines.length === 0
      ? 'Add at least one quoted item.'
      : quoting.size > 0
        ? 'Wait for current prices.'
        : !dateValid
          ? `Use YYYY-MM-DD on or after ${props.minimumDeliveryDate}.`
          : null;

  function abandonAttempt() {
    attempt?.settle();
    setAttempt(null);
  }

  async function setQuantity(item: CatalogItem, quantity: number) {
    if (!customer?.defaultSiteId) return;
    abandonAttempt();
    const key = item.productUomId;
    const sequence = (quoteSequence.current.get(key) ?? 0) + 1;
    quoteSequence.current.set(key, sequence);
    setError(null);
    if (quantity <= 0) {
      setLines((current) => current.filter((line) => line.productUomId !== key));
      return;
    }
    setQuoting((current) => new Set(current).add(key));
    try {
      const quoted = await props.onQuote(customer, item, quantity);
      if (quoteSequence.current.get(key) !== sequence) return;
      setLines((current) => [...current.filter((line) => line.productUomId !== key), quoted]);
    } catch (caught) {
      if (quoteSequence.current.get(key) === sequence) {
        setError(caught instanceof Error ? caught.message : 'Foodline could not quote this item.');
      }
    } finally {
      if (quoteSequence.current.get(key) === sequence) {
        setQuoting((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    }
  }

  async function commit() {
    if (blocker || !customer?.defaultSiteId) return;
    const currentAttempt = attempt ?? new Attempt('sales-order.create');
    setAttempt(currentAttempt);
    setCommitting(true);
    setError(null);
    try {
      const result = await props.onCommit(
        {
          customerId: customer.id,
          customerSiteId: customer.defaultSiteId,
          lines,
          requestedDeliveryDate: requestedDate,
          customerPo: customerPo.trim() || null,
        },
        currentAttempt
      );
      currentAttempt.settle();
      setAttempt(null);
      setCreated(result);
      setPhase('done');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Foodline could not create this order.');
    } finally {
      setCommitting(false);
    }
  }

  if (phase === 'done' && created) {
    return (
      <Confirmation
        confirmation={created}
        customerName={customer?.name ?? ''}
        requestedDate={requestedDate}
        onOpen={() => props.onOpenSalesOrder(created.id)}
        onAnother={() => {
          setPhase('customer');
          setCustomer(null);
          setLines([]);
          setRequestedDate(props.defaultDeliveryDate);
          setCustomerPo('');
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
        {phase === 'customer' ? (
          <CustomerStep
            customers={props.customers}
            selectedId={customer?.id ?? null}
            onSelect={(next) => {
              abandonAttempt();
              setCustomer(next);
              setLines([]);
              setPhase('items');
            }}
          />
        ) : null}
        {phase === 'items' && customer ? (
          <ItemsStep
            catalog={props.catalog}
            lines={lines}
            quoting={quoting}
            onQuantity={setQuantity}
            currencyCode={props.currencyCode}
          />
        ) : null}
        {phase === 'review' && customer ? (
          <ReviewStep
            customer={customer}
            lines={lines}
            total={total}
            currencyCode={props.currencyCode}
            requestedDate={requestedDate}
            onRequestedDate={(value) => {
              abandonAttempt();
              setRequestedDate(value);
            }}
            customerPo={customerPo}
            onCustomerPo={(value) => {
              abandonAttempt();
              setCustomerPo(value);
            }}
          />
        ) : null}
        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        {lines.length ? (
          <View style={styles.totalRow}>
            <Text style={styles.rowMeta}>
              {lines.length} {lines.length === 1 ? 'line' : 'lines'}
            </Text>
            <Text style={styles.totalValue}>{formatMoney(total, props.currencyCode)}</Text>
          </View>
        ) : null}
        {phase === 'review' && blocker ? <Text style={styles.blocker}>{blocker}</Text> : null}
        <View style={styles.actions}>
          <FoodlineButton
            label={phase === 'review' ? 'Create order' : 'Continue'}
            busy={committing}
            disabled={
              phase === 'items'
                ? lines.length === 0 || quoting.size > 0
                : phase === 'review'
                  ? blocker !== null
                  : !customer
            }
            onPress={() =>
              phase === 'items' ? setPhase('review') : phase === 'review' ? void commit() : undefined
            }
            style={styles.grow}
          />
          <FoodlineButton
            label={phase === 'customer' ? 'Cancel' : 'Back'}
            variant="quiet"
            disabled={committing}
            onPress={() =>
              phase === 'customer' ? props.onCancel() : setPhase(phase === 'review' ? 'items' : 'customer')
            }
          />
        </View>
      </View>
    </View>
  );
}

function CustomerStep({
  customers,
  selectedId,
  onSelect,
}: {
  customers: NewOrderCustomer[];
  selectedId: string | null;
  onSelect: (customer: NewOrderCustomer) => void;
}) {
  const [query, setQuery] = useState('');
  const shown = customers.filter((customer) =>
    `${customer.name} ${customer.code}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <>
      <SearchField value={query} onChange={setQuery} placeholder="Search customers" />
      <Card padded={false}>
        {shown.map((customer, index) => (
          <Pressable
            key={customer.id}
            disabled={!customer.eligible}
            onPress={() => onSelect(customer)}
            accessibilityRole="button"
            accessibilityState={{ selected: customer.id === selectedId, disabled: !customer.eligible }}
          >
            <CardRow first={index === 0}>
              <View style={styles.grow}>
                <Text style={styles.rowTitle}>{customer.name}</Text>
                <Text style={styles.rowMeta}>
                  {customer.code}
                  {customer.defaultSiteLabel ? ` · ${customer.defaultSiteLabel}` : ''}
                </Text>
                {!customer.eligible ? <Text style={styles.blocker}>Not eligible for ordering</Text> : null}
              </View>
              {customer.id === selectedId ? <StatusPill label="Chosen" tone="ok" /> : null}
            </CardRow>
          </Pressable>
        ))}
      </Card>
    </>
  );
}

function ItemsStep({
  catalog,
  lines,
  quoting,
  onQuantity,
  currencyCode,
}: {
  catalog: CatalogItem[];
  lines: DraftLine[];
  quoting: Set<string>;
  onQuantity: (item: CatalogItem, quantity: number) => Promise<void>;
  currencyCode: string;
}) {
  const [query, setQuery] = useState('');
  const shown = catalog
    .filter((item) => `${item.name} ${item.sku}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 100);
  const lineFor = (id: string) => lines.find((line) => line.productUomId === id);
  return (
    <>
      <SearchField value={query} onChange={setQuery} placeholder="Search live catalog" />
      <Card padded={false}>
        {shown.map((item, index) => {
          const line = lineFor(item.productUomId);
          const qty = line?.quantity ?? 0;
          const busy = quoting.has(item.productUomId);
          return (
            <CardRow key={item.productUomId} first={index === 0}>
              <View style={styles.grow}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.sku} · {item.uom} · {item.availableQuantity} available
                </Text>
                {line ? (
                  <Text style={styles.price}>{formatMoney(line.unitPrice, currencyCode)} each</Text>
                ) : null}
              </View>
              <View style={styles.stepper}>
                <Pressable
                  disabled={busy || qty === 0}
                  onPress={() => void onQuantity(item, qty - 1)}
                  style={[styles.stepBtn, (busy || qty === 0) && styles.disabled]}
                >
                  <Text style={styles.stepGlyph}>−</Text>
                </Pressable>
                <Text style={styles.qty}>{busy ? '…' : qty}</Text>
                <Pressable
                  disabled={busy}
                  onPress={() => void onQuantity(item, qty + 1)}
                  style={[styles.stepBtn, busy && styles.disabled]}
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
  customer,
  lines,
  total,
  currencyCode,
  requestedDate,
  onRequestedDate,
  customerPo,
  onCustomerPo,
}: {
  customer: NewOrderCustomer;
  lines: DraftLine[];
  total: string;
  currencyCode: string;
  requestedDate: string;
  onRequestedDate: (value: string) => void;
  customerPo: string;
  onCustomerPo: (value: string) => void;
}) {
  return (
    <>
      <Card>
        <Text style={styles.rowTitle}>{customer.name}</Text>
        <Text style={styles.rowMeta}>{customer.defaultSiteLabel}</Text>
      </Card>
      <Card padded={false}>
        {lines.map((line, index) => (
          <CardRow key={line.productUomId} first={index === 0}>
            <Text style={[styles.rowTitle, styles.grow]} numberOfLines={1}>
              {line.description}
            </Text>
            <Text style={styles.qty}>{line.quantity}</Text>
            <Text style={styles.lineTotal}>{formatMoney(line.extendedAmount, currencyCode)}</Text>
          </CardRow>
        ))}
        <CardRow>
          <Text style={[styles.rowTitle, styles.grow]}>Subtotal</Text>
          <Text style={styles.lineTotal}>{formatMoney(total, currencyCode)}</Text>
        </CardRow>
      </Card>
      <Field
        label="Requested delivery date"
        value={requestedDate}
        onChange={onRequestedDate}
        placeholder="YYYY-MM-DD"
      />
      <Field
        label="Customer PO (optional)"
        value={customerPo}
        onChange={onCustomerPo}
        placeholder="Customer reference"
      />
    </>
  );
}

function Confirmation({
  confirmation,
  customerName,
  requestedDate,
  onOpen,
  onAnother,
}: {
  confirmation: SalesOrderConfirmation;
  customerName: string;
  requestedDate: string;
  onOpen: () => void;
  onAnother: () => void;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.confirm}>
      <View style={styles.tick}>
        <Text style={styles.tickGlyph}>✓</Text>
      </View>
      <Text style={styles.confirmTitle}>Order confirmed</Text>
      <Mono>{confirmation.documentNumber}</Mono>
      <Card style={styles.confirmCard}>
        <Text style={styles.rowTitle}>{customerName}</Text>
        <Text style={styles.rowMeta}>
          {formatMoney(confirmation.total, confirmation.currencyCode)} · Delivery {requestedDate}
        </Text>
      </Card>
      <FoodlineButton label="Open this order" onPress={onOpen} style={styles.confirmBtn} />
      <FoodlineButton label="Create another" variant="quiet" onPress={onAnother} style={styles.confirmBtn} />
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.ink.disabled}
        style={styles.field}
        maxLength={120}
      />
    </View>
  );
}
function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.ink.disabled}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}
function order(phase: Phase) {
  return phase === 'customer' ? 0 : phase === 'items' ? 1 : phase === 'review' ? 2 : 3;
}

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
  );
}

function minorUnits(value: string): bigint {
  const [whole = '0', fraction = ''] = value.split('.');
  const padded = `${fraction}000`;
  const rounded = BigInt(padded.slice(0, 2)) + (padded.charAt(2) >= '5' ? 1n : 0n);
  return BigInt(whole) * 100n + rounded;
}
function addMoney(values: string[]): string {
  const total = values.reduce((sum, value) => sum + minorUnits(value), 0n);
  return `${total / 100n}.${(total % 100n).toString().padStart(2, '0')}`;
}
function formatMoney(value: string, currencyCode: string): string {
  const amount = minorUnits(value);
  const sign = amount < 0 ? '-' : '';
  const absolute = amount < 0 ? -amount : amount;
  const symbol = currencyCode === 'USD' ? '$' : `${currencyCode} `;
  return `${sign}${symbol}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  progress: { padding: space.screen, paddingBottom: 6 },
  content: { padding: space.screen, paddingTop: 6, gap: space.gap, paddingBottom: 24 },
  grow: { flex: 1, minWidth: 0 },
  search: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radius.input,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink.DEFAULT },
  rowTitle: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  rowMeta: { ...typeScale.small, color: colors.ink.subtle, marginTop: 2 },
  price: { ...typeScale.small, color: colors.brand.pressed, marginTop: 3 },
  blocker: { ...typeScale.small, color: colors.warn.DEFAULT },
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
  disabled: { opacity: 0.4 },
  stepGlyph: { fontSize: 18, color: colors.brand.pressed },
  qty: { minWidth: 32, textAlign: 'right', ...typeScale.bodyStrong, fontVariant: ['tabular-nums'] },
  lineTotal: {
    minWidth: 86,
    textAlign: 'right',
    ...typeScale.bodyStrong,
    color: colors.ink.DEFAULT,
    fontVariant: ['tabular-nums'],
  },
  label: { ...typeScale.small, color: colors.ink.muted, fontWeight: '600', marginBottom: 6 },
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
  totalValue: { fontSize: 20, fontWeight: '600', color: colors.ink.DEFAULT, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 10 },
  error: {
    padding: 13,
    borderRadius: radius.card,
    backgroundColor: colors.danger.tint,
    borderWidth: 1,
    borderColor: colors.danger.line,
  },
  errorText: { ...typeScale.small, color: colors.danger.DEFAULT, fontWeight: '600' },
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
  confirmTitle: { ...typeScale.titleSm, color: colors.ink.DEFAULT },
  confirmCard: { alignSelf: 'stretch', marginTop: 8 },
  confirmBtn: { alignSelf: 'stretch' },
});
