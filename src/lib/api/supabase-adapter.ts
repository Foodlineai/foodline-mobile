import { getSupabase } from '../supabase';
import type { FoodlineApi } from './ports';
import type {
  ActionItem,
  ActivityLine,
  Company,
  Customer,
  DeliveryRoute,
  DeliveryStop,
  DockReceipt,
  HomeSummary,
  HubMetric,
  Item,
  PurchaseOrder,
  PurchasingSummary,
  ReceivingTask,
  ReceivingWarehouse,
  SalesOrder,
  SalesSummary,
  ScannerSession,
  Session,
  ShipmentLine,
  StockStatus,
  StopDetail,
  UUID,
} from './types';
import * as workos from '@/features/auth/workos';
import { toCustomerDetail } from '@/features/customers/adapter';
import type { DraftedPurchaseOrder } from '@/features/routines/types';
import type { ShipmentDraft } from '@/features/shipments/types';

/**
 * Live adapter. Every call is an RPC — there are no direct table reads, because
 * the ERP retired that path ("Use the Supabase Data API, RLS-protected views,
 * and approved RPCs" — supabase/functions/api-v1/index.ts returns 410).
 *
 * RPC names and argument shapes come from the generated `database.types.ts`,
 * copied verbatim from the ERP repo. Regenerate both together:
 *   supabase gen types typescript --project-id fzavogttmmyyeuguvmry
 */

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

function asRows(payload: unknown, ...keys: string[]): Row[] {
  if (Array.isArray(payload)) return payload as Row[];
  if (payload && typeof payload === 'object') {
    for (const key of keys) {
      const value = (payload as Row)[key];
      if (Array.isArray(value)) return value as Row[];
    }
  }
  return [];
}

function deriveStatus(onHand: number, par: number | null): StockStatus {
  if (onHand <= 0) return 'out';
  if (par === null || par === 0) return 'ok';
  if (onHand < par * 0.5) return 'low';
  if (onHand > par * 1.5) return 'over';
  return 'ok';
}

/** `health` enum confirmed on `product_directory_snapshot`'s row payload —
 * a single combined status, not independent below-par/expiring flags. */
const EXPIRING_HEALTH = new Set(['expiring_lot', 'margin_and_expiry']);

function toItem(r: Row): Item {
  const onHand = num(r.on_hand ?? r.quantity_on_hand);
  const parLevel = numOrNull(r.par_level ?? r.target_level);
  const baseUom = r.baseUom as Row | undefined;
  const warehouseBalances = Array.isArray(r.warehouseBalances) ? (r.warehouseBalances as Row[]) : [];
  const preferredBin = (warehouseBalances[0]?.preferredBin as Row | undefined) ?? undefined;
  const health = str(r.health);
  return {
    id: str(r.id ?? r.product_id),
    sku: str(r.sku ?? r.product_sku),
    name: str(r.displayName ?? r.name ?? r.product_name),
    category: (r.category as string | null) ?? null,
    uom: str(baseUom?.code ?? r.uom_code ?? r.uom, 'EA'),
    onHand,
    onOrder: num(r.on_order ?? r.quantity_on_order),
    parLevel,
    daysCover: numOrNull(r.days_cover),
    lastCost: numOrNull(r.last_cost ?? r.unit_cost),
    primaryVendorName: (r.primary_vendor_name as string | null) ?? null,
    status: (r.status as StockStatus) ?? deriveStatus(onHand, parLevel),
    catchWeight: r.catchWeight === true,
    binLocation: preferredBin ? str(preferredBin.code) || null : null,
    expiringSoon: EXPIRING_HEALTH.has(health),
  };
}

function toPurchaseOrder(r: Row): PurchaseOrder {
  return {
    id: str(r.id ?? r.purchase_order_id),
    number: str(r.document_number ?? r.number ?? r.po_number),
    vendorId: str(r.vendor_id),
    vendorName: str(r.vendor_name),
    status: (r.status as PurchaseOrder['status']) ?? 'draft',
    expectedAt: (r.expected_at as string | null) ?? (r.expected_delivery_date as string | null) ?? null,
    total: numOrNull(r.total ?? r.total_amount),
    lineCount: num(r.line_count),
  };
}

function toReceivingTask(r: Row): ReceivingTask {
  return {
    taskId: str(r.task_id),
    goodsReceiptId: str(r.goods_receipt_id),
    purchaseOrderVersionLineId: str(r.purchase_order_version_line_id),
    productId: str(r.product_id),
    productSku: str(r.product_sku),
    productName: str(r.product_name),
    lineNumber: num(r.line_number),
    uomCode: str(r.ordered_uom_code, 'EA'),
    orderedBaseQuantity: num(r.ordered_base_quantity),
    priorReceivedBaseQuantity: num(r.prior_received_base_quantity),
    remainingBaseQuantity: num(r.remaining_base_quantity),
    receiptDocumentNumber: str(r.receipt_document_number),
    receiptRowVersion: num(r.receipt_row_version),
    isEligible: r.is_eligible === true,
    blockerCode: (r.blocker_code as string | null) || null,
    tracksLots: r.track_lots === true,
    tracksExpiry: r.track_expiry === true,
    catchWeight: r.catch_weight === true,
    temperatureRequired: r.temperature_required === true,
  };
}


function toWarehouse(r: Row): ReceivingWarehouse {
  return {
    id: str(r.id ?? r.warehouse_id),
    code: str(r.code ?? r.warehouse_code),
    name: str(r.name ?? r.warehouse_name),
    receivingBinId: (r.receiving_bin_id as string | null) ?? null,
  };
}

function toDockReceipt(r: Row): DockReceipt {
  return {
    goodsReceiptId: str(r.goods_receipt_id ?? r.id),
    documentNumber: str(r.document_number ?? r.goods_receipt_number ?? r.receipt_document_number),
    warehouseId: str(r.warehouse_id),
    vendorName: str(r.vendor_name),
    purchaseOrderNumber: (r.purchase_order_number as string | null) ?? null,
    status: (r.status as DockReceipt['status']) ?? 'open',
    rowVersion: num(r.row_version ?? r.goods_receipt_row_version ?? r.receipt_row_version, 1),
    openLineCount: numOrNull(r.open_line_count ?? r.remaining_line_count),
    arrivedAt: (r.arrived_at as string | null) ?? null,
  };
}


function toSalesOrder(r: Row): SalesOrder {
  return {
    id: str(r.id ?? r.sales_order_id),
    number: str(r.document_number ?? r.number ?? r.order_number),
    customerId: str(r.customer_id),
    customerName: str(r.customer_name),
    state: (r.state as SalesOrder['state']) ?? (r.status as SalesOrder['state']) ?? 'confirmed',
    attention: (r.attention as string | null) ?? (r.attention_reason as string | null) ?? null,
    total: numOrNull(r.total ?? r.total_amount),
    promisedFor: (r.promised_for as string | null) ?? (r.promised_at as string | null) ?? null,
  };
}

function toCustomer(r: Row): Customer {
  return {
    id: str(r.id ?? r.customer_id),
    name: str(r.name ?? r.customer_name),
    subtitle: (r.subtitle as string | null) ?? (r.city as string | null) ?? null,
  };
}

function toStop(r: Row): DeliveryStop {
  return {
    id: str(r.id ?? r.stop_id),
    sequence: num(r.sequence ?? r.stop_number ?? r.position),
    customerName: str(r.customer_name ?? r.name),
    address: str(r.address ?? r.address_line),
    windowLabel: (r.window_label as string | null) ?? null,
    note: (r.note as string | null) ?? (r.instructions as string | null) ?? null,
    state: (r.state as DeliveryStop['state']) ?? (r.status as DeliveryStop['state']) ?? 'pending',
    phone: (r.phone as string | null) ?? null,
    rowVersion: num(r.row_version ?? r.stop_row_version, 1),
  };
}

// The generated Database type is huge and RPC arg types are exact; the app
// intentionally goes through one loosely-typed call helper rather than
// threading 343 signatures through the UI. Payload shapes are validated by the
// mappers above, which is where a schema change should surface.
type Rpc = (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

async function call(companyId: UUID | null, name: string, args?: Record<string, unknown>): Promise<unknown> {
  const client = getSupabase(companyId);
  const { data, error } = await (client.rpc as unknown as Rpc)(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}

function toSession(payload: unknown): Session {
  const p = (payload ?? {}) as Row;
  const companies = asRows(p.companies).map(
    (c): Company => ({
      id: str(c.id),
      name: str(c.name),
      slug: str(c.slug),
      roleKey: str(c.roleKey ?? c.role_key),
      permissionKeys: Array.isArray(c.permissionKeys)
        ? (c.permissionKeys as string[])
        : Array.isArray(c.permission_keys)
          ? (c.permission_keys as string[])
          : [],
    })
  );
  return {
    actorId: str(p.actorId ?? p.actor_id),
    companyId: (p.companyId as string | null) ?? (p.company_id as string | null) ?? null,
    companies,
  };
}

export const supabaseApi: FoodlineApi = {
  session: {
    signIn: workos.signIn,
    async signOut() {
      await workos.signOut();
    },
    async resolve(companyId) {
      if (!(await workos.hasStoredSession())) return null;
      const payload = await call(companyId, 'application_session_context', { p_company_id: companyId });
      return toSession(payload);
    },
  },

  home: {
    /**
     * Assembled from the commercial dashboard RPC. The ERP's payload shape for
     * `needs_you` / `across_company` is not pinned down yet, so unknown keys are
     * simply absent rather than guessed — the screen degrades to tiles only.
     */
    async summary(companyId): Promise<HomeSummary> {
      const payload = (await call(companyId, 'get_current_commercial_dashboard')) as Row;
      const tiles = asRows(payload, 'metrics', 'tiles', 'kpis').map((r) => ({
        key: str(r.key ?? r.id),
        label: str(r.label ?? r.title),
        value: str(r.value ?? r.formatted_value),
        delta: numOrNull(r.delta ?? r.change_percent),
        tone: (r.tone as HomeSummary['tiles'][number]['tone']) ?? ('neutral' as const),
      }));
      const needsYou = asRows(payload.needs_you ?? payload.needsYou).map(
        (r): ActionItem => ({
          key: str(r.key ?? r.id),
          title: str(r.title ?? r.label),
          workspace: str(r.workspace ?? r.module),
          count: num(r.count),
          route: (r.route as string | null) ?? null,
        })
      );
      const acrossCompany = asRows(payload.across_company ?? payload.acrossCompany).map(
        (r): ActivityLine => ({
          key: str(r.key ?? r.id),
          label: str(r.label),
          detail: str(r.detail ?? r.summary),
          route: (r.route as string | null) ?? null,
        })
      );
      const ai = payload.ai_summary ?? payload.aiSummary;
      return {
        greetingName: str(payload.greeting_name ?? payload.greetingName),
        tiles: tiles.slice(0, 2),
        needsYou,
        acrossCompany,
        aiSummary:
          ai && typeof ai === 'object'
            ? {
                body: str((ai as Row).body ?? (ai as Row).summary),
                actionLabel: str((ai as Row).action_label ?? (ai as Row).actionLabel, 'Review impact'),
              }
            : null,
      };
    },
  },

  hub: {
    async metrics(companyId) {
      const payload = await call(companyId, 'get_current_commercial_dashboard');
      const rows = asRows(payload, 'metrics', 'tiles', 'kpis');
      return rows.map(
        (r): HubMetric => ({
          key: str(r.key ?? r.id),
          label: str(r.label ?? r.title),
          value: str(r.value ?? r.formatted_value),
          delta: numOrNull(r.delta ?? r.change_percent),
          tone: (r.tone as HubMetric['tone']) ?? 'neutral',
        })
      );
    },
  },

  items: {
    async list(companyId, params) {
      const payload = await call(companyId, 'product_directory_snapshot', { p_company_id: companyId });
      let rows = asRows(payload, 'products', 'items', 'rows').map(toItem);
      const q = params?.search?.trim().toLowerCase();
      if (q) rows = rows.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
      if (params?.onlyBelowPar) rows = rows.filter((i) => i.status === 'low' || i.status === 'out');
      return rows;
    },
  },

  purchaseOrders: {
    async list(companyId, params) {
      const payload = await call(companyId, 'purchase_order_directory_snapshot', { p_company_id: companyId });
      const rows = asRows(payload, 'purchaseOrders', 'purchase_orders', 'rows').map(toPurchaseOrder);
      return params?.openOnly === false
        ? rows
        : rows.filter((o) => o.status !== 'received' && o.status !== 'cancelled');
    },

    async summary(companyId): Promise<PurchasingSummary> {
      const payload = (await call(companyId, 'purchase_order_directory_snapshot', {
        p_company_id: companyId,
      })) as Row;
      const rows = asRows(payload, 'purchaseOrders', 'purchase_orders', 'rows').map(toPurchaseOrder);
      const issue = (payload.top_supply_issue ?? payload.topIssue) as Row | undefined;
      return {
        approvalCount: num(payload.approval_count, rows.filter((o) => o.status === 'draft').length),
        supplyIssueCount: num(payload.supply_issue_count),
        topIssue: issue
          ? {
              productName: str(issue.product_name),
              ordersAffected: num(issue.orders_affected),
              neededQuantity: num(issue.needed_quantity),
              incomingQuantity: num(issue.incoming_quantity),
              uom: str(issue.uom_code, 'cases'),
            }
          : null,
        awaitingReview: rows.filter((o) => o.status === 'draft').slice(0, 5),
        incomingToday: rows.filter((o) => o.status === 'sent' || o.status === 'confirmed').slice(0, 5),
      };
    },
  },

  sales: {
    async summary(companyId): Promise<SalesSummary> {
      const payload = (await call(companyId, 'get_current_sales_orders_workspace')) as Row;
      const orders = asRows(payload, 'orders', 'sales_orders', 'rows').map(toSalesOrder);
      const ai = payload.ai_insight ?? payload.aiInsight;
      return {
        ordersNeedingAttention: orders.filter((o) => o.attention !== null || o.state === 'short').slice(0, 8),
        customers: asRows(payload.customers).map(toCustomer).slice(0, 8),
        aiInsight:
          ai && typeof ai === 'object'
            ? {
                body: str((ai as Row).body ?? (ai as Row).summary),
                actionLabel: str((ai as Row).action_label ?? (ai as Row).actionLabel, 'Review order'),
              }
            : null,
      };
    },
    async customers(companyId) {
      const payload = (await call(companyId, 'get_current_sales_orders_workspace')) as Row;
      return asRows(payload.customers, 'rows').map(toCustomer);
    },
  },

  routes: {
    async today(companyId): Promise<DeliveryRoute | null> {
      const payload = (await call(companyId, 'get_current_delivery_route_workspace')) as Row;
      const route = (payload.route ?? payload) as Row;
      const stops = asRows(route.stops ?? payload.stops).map(toStop);
      if (stops.length === 0 && !route.id) return null;
      return {
        id: str(route.id ?? route.route_id),
        code: str(route.code ?? route.route_code),
        vehicleLabel: (route.vehicle_label as string | null) ?? (route.vehicle_code as string | null) ?? null,
        stopsTotal: num(route.stops_total, stops.length),
        stopsComplete: num(route.stops_complete, stops.filter((s2) => s2.state === 'complete').length),
        stops,
      };
    },
    async stop(companyId, stopId): Promise<StopDetail | null> {
      const payload = (await call(companyId, 'get_current_delivery_stop_detail', { p_stop_id: stopId })) as Row;
      const raw = (payload.stop ?? payload) as Row;
      if (!raw || (!raw.id && !raw.stop_id)) return null;
      return {
        stop: toStop(raw),
        lines: asRows(payload.lines ?? payload.shipment_lines).map(
          (l): ShipmentLine => ({
            id: str(l.id ?? l.line_id),
            productName: str(l.product_name ?? l.name),
            quantityLabel: str(l.quantity_label) || `${num(l.quantity)} ${str(l.uom_code, 'ea')}`,
            state: str(l.state ?? l.status, 'To confirm'),
          })
        ),
      };
    },
    async recordProofOfDelivery(companyId, input) {
      // `p_proof` is opaque JSON — the key names below are unconfirmed against the
      // ERP's own RPC body (see contracts/design.md: "confirm with Kartikeya, then
      // tighten"). If this errors with an unexpected-shape message from Postgres,
      // that is the signal the keys need correcting, not a reason to drop the
      // expected row version — a dropped connection mid-submit must never record
      // a delivery twice or overwrite a newer stop state.
      await call(companyId, 'record_current_proof_of_delivery_exact', {
        p_command_key: input.idempotencyKey,
        p_proof: {
          stop_id: input.stopId,
          expected_row_version: input.stopRowVersion,
          recipient_name: input.recipientName,
          signature_captured: input.signatureCaptured,
          photo_captured: input.photoCaptured,
          client_occurred_at: new Date().toISOString(),
        },
      });
    },
  },

  receiving: {
    async warehouses(companyId) {
      const payload = await call(companyId, 'list_receiving_location_warehouses');
      return asRows(payload, 'warehouses', 'rows').map(toWarehouse);
    },

    async dock(companyId, warehouseId) {
      const payload = await call(companyId, 'get_governed_receiving_dock');
      const rows = asRows(payload, 'receipts', 'goods_receipts', 'rows').map(toDockReceipt);
      const open = rows.filter((r) => r.status !== 'posted');
      return warehouseId ? open.filter((r) => r.warehouseId === warehouseId) : open;
    },

    async startSession(companyId, warehouseId, deviceId) {
      const payload = (await call(companyId, 'start_scanner_session', {
        p_warehouse_id: warehouseId,
        p_device_id: deviceId,
      })) as Row;
      return {
        sessionId: str(payload.session_id ?? payload.sessionId),
        rowVersion: num(payload.row_version ?? payload.rowVersion, 1),
        warehouseId,
      } satisfies ScannerSession;
    },

    async closeSession(companyId, session) {
      await call(companyId, 'close_scanner_session', {
        p_session_id: session.sessionId,
        p_expected_row_version: session.rowVersion,
      });
    },

    async queue(companyId, goodsReceiptId) {
      const payload = await call(companyId, 'get_governed_scanner_receiving_queue', {
        p_goods_receipt_id: goodsReceiptId,
      });
      return asRows(payload).map(toReceivingTask);
    },

    async submitScan(companyId, input) {
      await call(companyId, 'submit_scanner_scan', {
        p_scanner_session_id: input.session.sessionId,
        p_expected_session_row_version: input.session.rowVersion,
        p_claim_id: input.claimId,
        p_task_id: input.taskId,
        p_task_type: input.taskType,
        p_expected_task_row_version: input.taskRowVersion,
        p_expected_requirement_id: input.expectedRequirementId,
        p_raw_value: input.rawValue,
        p_symbology: input.symbology,
        p_input_method: input.inputMethod,
        p_idempotency_key: input.idempotencyKey,
        p_client_occurred_at: new Date().toISOString(),
      });
    },
  },

  customers: {
    async detail(companyId, customerId) {
      const payload = await call(companyId, 'get_current_customer_detail', { p_customer_id: customerId });
      return toCustomerDetail(payload as Row);
    },
  },

  routines: {
    async draft(companyId, purchaseOrderId) {
      const payload = (await call(companyId, 'get_purchase_order_workspace', {
        p_purchase_order_id: purchaseOrderId,
      })) as Row;
      const order = payload.purchase_order as Row | undefined;
      if (!order || !order.purchase_order_id) return null;
      const cycleId = str(order.approval_cycle_id);
      const requestVersion = str(order.approval_request_row_version);
      if (!cycleId || !requestVersion || order.approval_status !== 'pending' || order.can_decide !== true)
        return null;
      const currency = str(order.currency_code, 'USD');
      const amount = str(order.approval_amount, '0.00');
      const lines = asRows(order.lines);
      return {
        id: str(order.purchase_order_id),
        reference: str(order.document_number),
        vendorName: str(order.vendor_name),
        formattedTotal: currency === 'USD' ? `$${amount}` : `${currency} ${amount}`,
        summary: `${lines.length} line${lines.length === 1 ? '' : 's'}${order.warehouse_name ? ` · ${str(order.warehouse_name)}` : ''}`,
        lines: lines.slice(0, 5).map((line) => ({
          id: str(line.purchaseOrderVersionLineId ?? line.id),
          description: str(line.productName),
          quantityLabel: `${str(line.quantity)} ${str(line.uomCode)}`,
        })),
        lineOverflow: Math.max(0, lines.length - 5),
        rowVersion: str(order.purchase_order_row_version),
        approvalCycleId: cycleId,
        approvalRequestRowVersion: requestVersion,
      };
    },
    async approveDraftedPurchaseOrder(companyId, input) {
      const draft = input.draft as DraftedPurchaseOrder;
      await call(companyId, 'decide_purchase_order_approval_command', {
        p_command_key: input.idempotencyKey,
        p_approval_cycle_id: draft.approvalCycleId,
        p_expected_purchase_order_row_version: draft.rowVersion,
        p_expected_approval_request_row_version: draft.approvalRequestRowVersion,
        p_outcome: 'approve',
      });
    },
  },

  shipments: {
    async target(companyId, orderId) {
      const payload = (await call(companyId, 'get_current_sales_order_detail', {
        p_sales_order_id: orderId,
      })) as Row;
      if (!payload.id || (payload.capabilities as Row | undefined)?.canShip !== true) return null;
      const customer = (payload.customer ?? {}) as Row;
      const quantities = (payload.quantities ?? {}) as Row;
      const lines = asRows(payload.lines);
      return {
        orderId: str(payload.id),
        reference: str(payload.documentNumber),
        customerName: str(customer.name),
        summary: `${lines.length} line${lines.length === 1 ? '' : 's'} · ${str(quantities.remainingDemandBase, '0')} base units remaining`,
        rowVersion: str(payload.rowVersion),
      };
    },
    async post(companyId, draft: ShipmentDraft, idempotencyKey: string) {
      // No p_customer_reference on this RPC (confirmed against the live
      // source — that field lives on the invoice command, not shipment).
      // draft.customerReference is intentionally not sent anywhere here.
      await call(companyId, 'ship_current_sales_order', {
        p_command_key: idempotencyKey,
        p_sales_order_id: draft.orderId,
        p_expected_row_version: draft.rowVersion,
        p_shipped_on: draft.shipmentDate,
        p_carrier: draft.carrier,
        p_tracking_number: draft.trackingNumber,
        p_notes: draft.internalNote,
      });
    },
  },
};
