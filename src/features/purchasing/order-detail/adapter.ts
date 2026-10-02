import type { PurchaseOrderDetail, PurchaseOrderLineDetail } from './types';
import type { Tone } from '../../../components/primitives';

/**
 * PO detail adapter.
 *
 * `PURCHASE_ORDER_DETAIL_RPC` confirmed 1 Oct against the live ERP source
 * (foodline-frontend, supabase/migrations/20260928120000_baseline.sql):
 * `get_purchase_order_workspace(p_purchase_order_id uuid) returns jsonb`, which
 * resolves company from the session (no `p_company_id` param) and delegates to
 * `private.purchasing_get_po_workspace_wire`. That wire function builds its
 * payload with `to_jsonb(row)` over `private.purchasing_list_current_pos`'s
 * declared output columns, so the **top-level PO fields are snake_case**
 * (`document_number`, `vendor_name`, `line_count`, ...) while each entry in
 * `lines[]` is built with an explicit `jsonb_build_object` using **camelCase**
 * keys (`productName`, `unitCost`, ...). That mixed casing is real, confirmed
 * in the SQL itself, not a guess — `pick()` still tries both per key to
 * survive a future re-cast.
 *
 * Requires `purchasing.read` (raises `purchasing_read_required` without it)
 * and most of the payload additionally requires `purchasing.cost_read` — cost
 * fields come back null rather than the call failing; `canReadCost` on the
 * view model says which happened.
 *
 * Not surfaced here, confirmed present on the RPC but out of scope for a
 * first detail screen: `receipts`, `discrepancies`, `vendorBills`, `activity`,
 * `decisions`, `audit_events`. A screen that renders the order and its lines
 * is useful; dragging in the full AP/receiving history is a second pass.
 */
export const PURCHASE_ORDER_DETAIL_RPC: string | null = 'get_purchase_order_workspace';

type Raw = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;

const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

const pick = (row: Raw, ...keys: string[]): unknown => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  return undefined;
};

function money(v: unknown): string | null {
  const n = num(v);
  if (n === null) return null;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** `lifecycle_state`: draft | submitted | rejected | changes-requested | approved | cancelled. */
function toneForLifecycle(raw: string): Tone {
  const s = raw.toLowerCase();
  if (s === 'approved') return 'ok';
  if (s === 'cancelled' || s === 'rejected') return 'danger';
  if (s === 'submitted' || s.includes('changes')) return 'warn';
  return 'neutral';
}

function labelForLifecycle(raw: string): string {
  const s = raw.replace(/[_-]/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mapLine(row: Raw, index: number): PurchaseOrderLineDetail {
  const name = str(pick(row, 'productName', 'product_name'), 'Unknown item');
  return {
    id: str(pick(row, 'id', 'purchaseOrderVersionLineId'), `line-${index}`),
    lineNumber: num(pick(row, 'lineNumber', 'line_number')),
    productName: name,
    productSku: str(pick(row, 'productSku', 'product_sku')),
    uomCode: str(pick(row, 'uomCode', 'uom_code'), 'ea'),
    quantity: str(pick(row, 'quantity'), '0'),
    unitCost: money(pick(row, 'unitCost', 'unit_cost')),
    totalAmount: money(pick(row, 'totalAmount', 'total_amount')),
  };
}

/**
 * Maps whatever the RPC returns into the view model, degrading rather than
 * throwing — the same discipline as the customer adapter.
 */
export function toPurchaseOrderDetail(raw: Raw | null | undefined): PurchaseOrderDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  // Confirmed top-level key on get_purchase_order_workspace's payload.
  const po = ((raw as Raw).purchase_order ?? (raw as Raw).purchaseOrder ?? raw) as Raw;

  const documentNumber = str(pick(po, 'document_number', 'documentNumber'));
  if (!documentNumber) return null;

  const lifecycle = str(pick(po, 'lifecycle_state', 'lifecycleState'), 'draft');
  const vendorName = str(pick(po, 'vendor_name', 'vendorName'), 'Unknown vendor');
  const canReadCost = pick(po, 'can_read_cost', 'canReadCost') !== false && money(pick(po, 'approval_amount', 'approvalAmount')) !== null;

  return {
    id: str(pick(po, 'purchase_order_id', 'id'), 'unknown'),
    documentNumber,
    status: { label: labelForLifecycle(lifecycle), tone: toneForLifecycle(lifecycle) },
    vendor: {
      id: str(pick(po, 'vendor_id', 'vendorId'), '') || null,
      name: vendorName,
    },
    warehouseName: str(pick(po, 'warehouse_name', 'warehouseName')) || null,
    orderDate: str(pick(po, 'order_date', 'orderDate')) || null,
    expectedDeliveryDate: str(pick(po, 'expected_delivery_date', 'expectedDeliveryDate')) || null,
    notes: str(pick(po, 'notes')) || null,
    total: money(pick(po, 'approval_amount', 'approvalAmount')),
    lineCount: num(pick(po, 'line_count', 'lineCount')) ?? arr(pick(po, 'lines')).length,
    lines: arr(pick(po, 'lines')).map(mapLine),
    canReadCost,
    rowVersion: str(pick(po, 'purchase_order_row_version', 'purchaseOrderRowVersion'), '1'),
  };
}
