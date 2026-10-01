import type { SalesOrderDetail, SalesOrderLineDetail } from './types';
import type { Tone } from '../../../components/primitives';

/**
 * Sales order detail adapter.
 *
 * `SALES_ORDER_DETAIL_RPC` confirmed 1 Oct against the live ERP source
 * (foodline-frontend, supabase/migrations/20260928120000_baseline.sql):
 * `get_current_sales_order_detail(p_sales_order_id uuid) returns jsonb`,
 * backed by `private.sales_order_detail_base` plus fulfillment facts merged
 * in. Every key confirmed here is camelCase, built with explicit
 * `jsonb_build_object` calls — no snake_case fallback needed, unlike the PO
 * workspace RPC.
 *
 * Requires `sales.read`.
 *
 * Not surfaced here, confirmed present but out of scope for a first detail
 * screen: `reservations`, `shipments`, `invoices`, `history`, and the
 * `capabilities` block (ship/reverse-shipment/void-invoice gates — those are
 * actions, not a reading concern, and belong on whichever screen actually
 * exposes the corresponding button).
 */
export const SALES_ORDER_DETAIL_RPC: string | null = 'get_current_sales_order_detail';

type Raw = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

function money(v: unknown): string | null {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  if (Number.isNaN(n)) return null;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function toneForOrderState(raw: string): Tone {
  const s = raw.toLowerCase();
  if (s === 'cancelled') return 'danger';
  if (s === 'short') return 'warn';
  if (s === 'confirmed' || s === 'delivered') return 'ok';
  return 'neutral';
}

function label(raw: string): string {
  const s = raw.replace(/[_-]/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mapLine(row: Raw, index: number): SalesOrderLineDetail {
  return {
    id: str(row.id, `line-${index}`),
    lineNumber: num(row.lineNumber),
    itemLabel: str(row.itemLabel, 'Unknown item'),
    sku: str(row.sku),
    uomCode: str(row.uomCode, 'ea'),
    orderedQuantity: str(row.orderedQuantity, '0'),
    shippedBaseQuantity: str(row.shippedBaseQuantity, '0'),
    unitPrice: money(row.unitPrice),
    totalAmount: money(row.totalAmount),
  };
}

export function toSalesOrderDetail(raw: Raw | null | undefined): SalesOrderDetail | null {
  if (!raw || typeof raw !== 'object') return null;

  const documentNumber = str((raw as Raw).documentNumber);
  if (!documentNumber) return null;

  const customer = (raw as Raw).customer as Raw | undefined;
  const states = (raw as Raw).states as Raw | undefined;
  const orderState = str(states?.order, 'draft');

  return {
    id: str((raw as Raw).id, 'unknown'),
    documentNumber,
    customer: {
      id: str(customer?.id, 'unknown'),
      name: str(customer?.name, 'Unknown customer'),
    },
    orderStatus: { label: label(orderState), tone: toneForOrderState(orderState) },
    shipmentStatus: label(str(states?.shipment, 'not shipped')),
    invoiceStatus: label(str(states?.invoice, 'unbilled')),
    orderDate: str((raw as Raw).orderDate) || null,
    requestedDeliveryDate: str((raw as Raw).requestedDeliveryDate) || null,
    total: money((raw as Raw).totalAmount),
    lines: arr((raw as Raw).lines).map(mapLine),
    rowVersion: str((raw as Raw).rowVersion, '1'),
  };
}
