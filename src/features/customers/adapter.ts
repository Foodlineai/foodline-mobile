import type { CustomerDetail, FrequentItem, RecentOrder } from './types';
import type { Tone } from '../../components/primitives';

/**
 * Customer 360 adapter.
 *
 * `CUSTOMER_DETAIL_RPC` confirmed 29 Sep against the live ERP source
 * (foodline-frontend, supabase/migrations/20260928120000_baseline.sql):
 * `get_current_customer_detail(p_customer_id uuid) returns jsonb`. The ERP's
 * own TS wrapper (`customer-master.repository.server.ts`) reads it through a
 * schema at `customer-master-contracts.ts` — that confirms the *fields*, not
 * necessarily the exact wire casing this RPC hands back raw (snake_case is
 * the Postgres convention; the ERP's schema may camelCase it on the way in).
 * `pick()` below still tries both, same discipline as before, now aimed at
 * confirmed field names instead of guessed ones.
 *
 * ⚠️ Two things that were asked for do not exist, confirmed by the same
 * search rather than assumed:
 *
 * - **No five-week order-frequency bucket.** No RPC, anywhere in the repo,
 *   returns a per-item per-week ordered/not-ordered array. `weeks` stays `[]`
 *   from live data — never bucket order history on the device to fill it in
 *   (payload size, timezone boundaries, and it would eventually disagree
 *   with what the ERP shows for the same question).
 * - **No "available credit" or "average order value" field**, on this RPC or
 *   any other. Only the raw `creditLimit` exists. Do not compute either by
 *   guessing what "used" or "average" means from `recentOrders` — that is
 *   exactly the kind of client-derived number that quietly disagrees with
 *   the ERP later. `figures` below only ever shows what's real.
 */
export const CUSTOMER_DETAIL_RPC: string | null = 'get_current_customer_detail';

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

/**
 * From `customer.mostCommonOrder`: a flat top-20-by-order-count list, not a
 * week-bucketed one. `weeklyLabel`'s own doc comment says "12 cases a week"
 * — that's not what this RPC gives us, so this reports the real total
 * instead of inventing a weekly rate the data can't support.
 */
function mapFrequentItem(row: Raw, index: number): FrequentItem | null {
  const name = str(pick(row, 'itemName', 'item_name', 'product_name', 'name'));
  if (!name) return null; // a row we cannot label is a row we do not render

  const uom = str(pick(row, 'uomCode', 'uom_code', 'uom'), 'ea');
  const totalQty = num(pick(row, 'totalQuantity', 'total_quantity'));
  const orderCount = num(pick(row, 'orderCount', 'order_count'));

  return {
    id: str(pick(row, 'productId', 'product_id', 'sku', 'id'), `item-${index}`),
    name,
    // No pack-size field on this RPC — sku is the closest real identifier.
    packSize: str(pick(row, 'sku'), '—'),
    weeklyLabel:
      totalQty === null || orderCount === null
        ? 'volume unknown'
        : `${totalQty} ${uom} across ${orderCount} order${orderCount === 1 ? '' : 's'}`,
    // No per-week bucket RPC exists — see this file's header. Never fabricate one.
    weeks: [],
  };
}

function mapRecentOrder(row: Raw, index: number): RecentOrder {
  const status = str(pick(row, 'status', 'state'), 'Unknown');
  return {
    id: str(pick(row, 'id', 'order_id'), `order-${index}`),
    reference: str(pick(row, 'documentNumber', 'document_number', 'reference'), '—'),
    placedLabel: str(pick(row, 'orderDate', 'order_date', 'placed_at'), ''),
    total: money(pick(row, 'totalAmount', 'total_amount', 'total')),
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
  // The RPC nests everything under `customer` per the ERP's own schema —
  // unwrap it the same defensive way the rest of this codebase unwraps a
  // `payload.stop ?? payload`-shaped response.
  const customer = ((raw as Raw).customer ?? raw) as Raw;

  const name = str(pick(customer, 'name', 'customer_name', 'display_name'));
  if (!name) return null;

  const creditLimit = pick(customer, 'creditLimit', 'credit_limit');
  // "Available credit" and "average order value" do not exist on this RPC —
  // see this file's header. Only push a figure we can actually back.
  const figures: CustomerDetail['figures'] = [];
  if (creditLimit !== undefined) figures.push({ label: 'Credit limit', value: money(creditLimit) });

  const frequentItems = arr(pick(customer, 'mostCommonOrder', 'most_common_order'))
    .map(mapFrequentItem)
    .filter((x): x is FrequentItem => x !== null);

  const priceTier = str(pick(customer, 'priceTier', 'price_tier'));
  const terms = str(pick(customer, 'paymentTerms', 'payment_terms'));

  return {
    id: str(pick(customer, 'id', 'customer_id'), 'unknown'),
    name,
    // priceTier is a code ("T1".."T5"), not a friendly label — this RPC
    // doesn't hand back display text for it, so show the code rather than
    // inventing wording for it.
    tierLabel: priceTier ? `Tier ${priceTier}` : 'Standard pricing',
    standing: terms ? { label: terms, tone: 'ok' } : undefined,
    figures,
    // No week-bucket RPC — always 0 rather than a number the UI can't back.
    frequencyWeeks: 0,
    frequentItems,
    recentOrders: arr(pick(customer, 'recentOrders', 'recent_orders')).map(mapRecentOrder),
  };
}
