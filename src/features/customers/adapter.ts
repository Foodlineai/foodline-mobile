import type { CustomerDetail, FrequentItem, RecentOrder } from './types';
import type { Tone } from '../../components/primitives';

/**
 * Customer 360 adapter.
 *
 * ⚠️ TODO(wiring) — THE RPC NAME IS NOT KNOWN.
 *
 * `contracts/backend.md` is explicit: there is no REST API, everything is an
 * RPC, and there are ~343 of them. Four are verified for mobile
 * (`get_current_commercial_dashboard`, `product_directory_snapshot`,
 * `purchase_order_directory_snapshot`, the scanner chain). Customer detail is
 * not one of them.
 *
 * Working agreement 8 says escalate rather than guess, so this file does not
 * invent a name. `CUSTOMER_DETAIL_RPC` is deliberately unset and the call site
 * falls back to fixtures until someone confirms it. Ask Kartikeya, then fill it
 * in here and delete this block.
 *
 * ⚠️ TODO(wiring) — THE FREQUENCY BUCKETS MUST COME FROM THE SERVER.
 *
 * `weeks` below is a five-element array, oldest first. Do NOT populate it by
 * pulling order history to the device and bucketing client-side:
 *
 *   - a customer with two years of orders is a large payload on a truck's LTE
 *   - week boundaries depend on the company's timezone and week-start, which
 *     live in the ERP, not on the handset
 *   - the phone and the web ERP would compute it separately and eventually
 *     disagree in front of a customer, which is worse than not shipping it
 *
 * The ask is one RPC returning, per item: item id, pack size, mean weekly
 * quantity, and the ordered bucket array. Small, cacheable, one source of truth.
 */
export const CUSTOMER_DETAIL_RPC: string | null = null;

/** Raw shape is unknown, so nothing here assumes a field exists. */
type Raw = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

/** Reads the first key that is actually present. Payload naming is unconfirmed. */
const pick = (row: Raw, ...keys: string[]): unknown => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  return undefined;
};

function money(v: unknown): string {
  const n = num(v);
  if (n === null) return str(v, '—');
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function toneForStatus(raw: string): Tone {
  const s = raw.toLowerCase();
  if (s.includes('deliver') || s.includes('complete') || s.includes('paid')) return 'ok';
  if (s.includes('short') || s.includes('hold') || s.includes('backorder')) return 'warn';
  if (s.includes('cancel') || s.includes('fail') || s.includes('overdue')) return 'danger';
  if (s.includes('transit') || s.includes('road') || s.includes('out for')) return 'info';
  return 'neutral';
}

function mapFrequentItem(row: Raw, index: number): FrequentItem | null {
  const name = str(pick(row, 'item_name', 'product_name', 'name'));
  if (!name) return null; // a row we cannot label is a row we do not render

  const buckets = pick(row, 'week_buckets', 'weeks', 'frequency');
  const weeks = Array.isArray(buckets)
    ? buckets.map((b) => (typeof b === 'boolean' ? b : (num(b) ?? 0) > 0))
    : [];

  const weekly = num(pick(row, 'mean_weekly_quantity', 'avg_weekly_qty'));
  const uom = str(pick(row, 'uom', 'unit_of_measure'), 'cases');

  return {
    id: str(pick(row, 'item_id', 'product_id', 'id'), `item-${index}`),
    name,
    packSize: str(pick(row, 'pack_size', 'pack', 'size'), '—'),
    weeklyLabel: weekly === null ? 'volume unknown' : `${weekly} ${uom} a week`,
    weeks,
  };
}

function mapRecentOrder(row: Raw, index: number): RecentOrder {
  const status = str(pick(row, 'status', 'state'), 'Unknown');
  return {
    id: str(pick(row, 'order_id', 'id'), `order-${index}`),
    reference: str(pick(row, 'order_number', 'reference', 'so_number'), '—'),
    placedLabel: str(pick(row, 'placed_label', 'placed_at_display', 'placed_at'), ''),
    total: money(pick(row, 'total', 'order_total', 'grand_total')),
    status: { label: status, tone: toneForStatus(status) },
  };
}

/**
 * Maps whatever the RPC returns into the view model, degrading rather than
 * throwing. A screen that renders four of six sections is useful; a screen that
 * crashes because one field was renamed is not — and this payload shape is not
 * yet confirmed.
 */
export function toCustomerDetail(raw: Raw | null | undefined): CustomerDetail | null {
  if (!raw || typeof raw !== 'object') return null;

  const name = str(pick(raw, 'customer_name', 'name', 'display_name'));
  if (!name) return null;

  const creditLimit = pick(raw, 'credit_limit', 'creditLimit');
  const available = pick(raw, 'credit_available', 'available_credit');
  const avgOrder = pick(raw, 'average_order_value', 'avg_order_value');

  const figures: CustomerDetail['figures'] = [];
  if (creditLimit !== undefined) figures.push({ label: 'Credit limit', value: money(creditLimit) });
  if (available !== undefined) figures.push({ label: 'Available', value: money(available), tone: 'ok' });
  if (avgOrder !== undefined) figures.push({ label: 'Avg order', value: money(avgOrder) });

  const frequentItems = arr(pick(raw, 'frequent_items', 'common_items', 'top_items'))
    .map(mapFrequentItem)
    .filter((x): x is FrequentItem => x !== null);

  const terms = str(pick(raw, 'payment_terms', 'terms'));

  return {
    id: str(pick(raw, 'customer_id', 'id'), 'unknown'),
    name,
    tierLabel: str(pick(raw, 'tier_label', 'price_tier', 'tier'), 'Standard pricing'),
    standing: terms ? { label: terms, tone: 'ok' } : undefined,
    figures,
    frequencyWeeks: frequentItems[0]?.weeks.length ?? 0,
    frequentItems,
    recentOrders: arr(pick(raw, 'recent_orders', 'orders')).map(mapRecentOrder),
  };
}
