import type {
  Customer,
  DeliveryRoute,
  DockReceipt,
  HomeSummary,
  HubMetric,
  Item,
  PurchaseOrder,
  PurchasingSummary,
  ReceivingTask,
  ReceivingWarehouse,
  SalesSummary,
  ScannerSession,
  Session,
  StopDetail,
  UUID,
} from './types';
import type { CustomerDetail } from '@/features/customers/types';
import type { ItemDetail } from '@/features/items/detail/types';
import type { PurchaseOrderDetail } from '@/features/purchasing/order-detail/types';
import type { DraftedPurchaseOrder } from '@/features/routines/types';
import type { SalesOrderDetail } from '@/features/sales/order-detail/types';
import type { SalesOrderFulfillment } from '@/features/sales/order-detail/fulfillment-types';
import type { ShipmentDraft, ShipmentTarget } from '@/features/shipments/types';
import type { VendorDetail } from '@/features/vendors/types';

/**
 * The single seam between the app and the ERP.
 *
 * Live implementation calls the `erp_api` / public RPCs on the shared Supabase
 * project. Screens depend only on this live contract.
 */
export interface FoodlineApi {
  session: {
    /** WorkOS AuthKit hosted flow. */
    signIn(): Promise<void>;
    signOut(): Promise<void>;
    /** `application_session_context` — null when no stored WorkOS session. */
    resolve(companyId: UUID | null): Promise<Session | null>;
  };
  home: {
    /** Powers the Home tab. One call, so the first screen is one spinner. */
    summary(companyId: UUID): Promise<HomeSummary>;
  };
  hub: {
    metrics(companyId: UUID): Promise<HubMetric[]>;
  };
  items: {
    list(companyId: UUID, params?: { search?: string; onlyBelowPar?: boolean }): Promise<Item[]>;
    /**
     * `get_current_product_workspace` — confirmed against the live ERP
     * source 1 Oct. Requires `catalog.read`; `inventory`/`lots` additionally
     * need `inventory.read` — see `features/items/detail/adapter.ts`.
     */
    detail(companyId: UUID, productId: UUID): Promise<ItemDetail | null>;
  };
  purchaseOrders: {
    list(companyId: UUID, params?: { openOnly?: boolean }): Promise<PurchaseOrder[]>;
    /** Powers the Purchasing module screen (mockup 03). */
    summary(companyId: UUID): Promise<PurchasingSummary>;
    /**
     * `get_purchase_order_workspace` — confirmed against the live ERP source
     * 1 Oct. Requires `purchasing.read`; cost fields (unit cost, totals) come
     * back null rather than the call failing when `purchasing.cost_read` is
     * also missing — see `features/purchasing/order-detail/adapter.ts`.
     */
    detail(companyId: UUID, purchaseOrderId: UUID): Promise<PurchaseOrderDetail | null>;
  };
  sales: {
    /** `get_current_sales_orders_workspace` — one call for the Sales screen. */
    summary(companyId: UUID): Promise<SalesSummary>;
    customers(companyId: UUID): Promise<Customer[]>;
    /** `get_current_sales_order_detail` — confirmed against the live ERP source 1 Oct. */
    orderDetail(companyId: UUID, salesOrderId: UUID): Promise<SalesOrderDetail | null>;
    /**
     * `get_current_sales_order_fulfillment` — confirmed against the live ERP
     * source 1 Oct. Per-line ordered/shipped/reserved/backordered base
     * quantities plus pick-wave task state; merged into the order detail
     * screen and the sole data source for `sales-order/[id]/short.tsx`.
     */
    orderFulfillment(companyId: UUID, salesOrderId: UUID): Promise<SalesOrderFulfillment | null>;
    /**
     * `cancel_current_sales_order_remainder`. ⚠️ Confirmed order-wide, not
     * per-line: it cancels the remaining open demand on *every* short line
     * on the order in one call — there is no per-line cancel RPC. Requires
     * `sales.manage`.
     */
    cancelRemainder(
      companyId: UUID,
      input: { salesOrderId: UUID; expectedOrderRowVersion: number; reason: string; idempotencyKey: string }
    ): Promise<void>;
    /**
     * `release_current_backorder`. Allocates newly-available stock against
     * one line's existing backordered quantity — the "stock showed up,
     * ship what we can now" action, not a way to *create* a backorder (a
     * line is simply backordered whenever its remaining demand has no
     * reservation; nothing needs to be called to put it in that state).
     * Requires `sales.manage`.
     */
    allocateBackorder(
      companyId: UUID,
      input: { salesOrderLineId: UUID; expectedOrderRowVersion: number; quantity: number | null; idempotencyKey: string }
    ): Promise<void>;
  };
  vendors: {
    /** `vendor_read` — confirmed against the live ERP source 1 Oct. Requires `vendors.read`. */
    detail(companyId: UUID, vendorId: UUID): Promise<VendorDetail | null>;
  };
  routes: {
    /** `get_current_delivery_route_workspace` — today's assigned route. */
    today(companyId: UUID): Promise<DeliveryRoute | null>;
    /** `get_current_delivery_stop_detail` */
    stop(companyId: UUID, stopId: UUID): Promise<StopDetail | null>;
    /**
     * `transition_current_delivery_stop_exact` with `p_action: 'arrive'`.
     * Requires the route to be `in_progress` (dispatched) — confirmed
     * server-side check, surfaces as an ordinary error if it isn't.
     */
    arriveAtStop(
      companyId: UUID,
      input: { stopId: UUID; expectedRowVersion: number; idempotencyKey: string }
    ): Promise<void>;
    /**
     * `record_current_proof_of_delivery_exact` — confirmed against the live
     * ERP source 1 Oct. `p_proof` requires a `lines` array (1–1000 entries)
     * whose delivered + refused + short quantities reconcile exactly to
     * each shipment line's base quantity; `recipientName` is required when
     * any quantity is delivered, `reason` when any is refused or short. No
     * `signatureAttachmentId`/`photoAttachmentId` sent — those require an
     * uploaded, server-verified evidence record, and no upload path exists
     * in this app yet. Not inventing one; always sent as `null`.
     */
    recordProofOfDelivery(
      companyId: UUID,
      input: {
        stopId: UUID;
        expectedStopVersion: number;
        expectedRouteVersion: number;
        recipientName: string | null;
        reason: string | null;
        lines: { shipmentLineId: UUID; deliveredBaseQuantity: number; refusedBaseQuantity: number; shortBaseQuantity: number }[];
        idempotencyKey: string;
      }
    ): Promise<void>;
  };
  receiving: {
    /** `list_receiving_location_warehouses` — warehouses this actor can receive into. */
    warehouses(companyId: UUID): Promise<ReceivingWarehouse[]>;
    /** `get_governed_receiving_dock` — receipts currently open on the dock. */
    dock(companyId: UUID, warehouseId: UUID | null): Promise<DockReceipt[]>;
    /** `start_scanner_session` */
    startSession(companyId: UUID, warehouseId: UUID, deviceId: string): Promise<ScannerSession>;
    /** `close_scanner_session` */
    closeSession(companyId: UUID, session: ScannerSession): Promise<void>;
    /** `get_governed_scanner_receiving_queue` */
    queue(companyId: UUID, goodsReceiptId: UUID): Promise<ReceivingTask[]>;
    /** `submit_scanner_scan` — idempotent, optimistic-concurrency guarded. */
    submitScan(
      companyId: UUID,
      input: {
        session: ScannerSession;
        claimId: UUID;
        taskId: UUID;
        taskType: string;
        taskRowVersion: number;
        expectedRequirementId: UUID;
        rawValue: string;
        symbology: string;
        inputMethod: 'scan' | 'manual';
        idempotencyKey: string;
      }
    ): Promise<void>;
  };
  customers: {
    /**
     * `get_current_customer_detail` — confirmed against the live ERP source
     * (foodline-frontend, 29 Sep). It does not carry a five-week order-
     * frequency bucket for any item — that RPC does not exist yet, confirmed
     * by the same search, not assumed. `frequentItems[].weeks` is always `[]`
     * from the live adapter until it does; never bucket order history on the
     * device to fill it in.
     */
    detail(companyId: UUID, customerId: UUID): Promise<CustomerDetail | null>;
  };
  routines: {
    /** Load the canonical PO, lines, and current approval cycle. */
    draft(companyId: UUID, purchaseOrderId: UUID): Promise<DraftedPurchaseOrder | null>;
    /**
     * `decide_purchase_order_approval_command` with `p_outcome: 'approve'`.
     * Approves the draft's *approval cycle*, not the PO row directly — needs
     * `draft.approvalCycleId` and `draft.approvalRequestRowVersion` alongside
     * the PO's own `rowVersion`. Idempotent via `idempotencyKey`.
     */
    approveDraftedPurchaseOrder(
      companyId: UUID,
      input: { draft: DraftedPurchaseOrder; idempotencyKey: string }
    ): Promise<void>;
  };
  shipments: {
    /** Load canonical row version and shipment eligibility for an order. */
    target(companyId: UUID, orderId: UUID): Promise<ShipmentTarget | null>;
    /**
     * `ship_current_sales_order`. That RPC has no customer-reference
     * parameter (confirmed against the live source — customer reference
     * lives on the separate invoice command, not shipment), so
     * `draft.customerReference` is accepted by this method but not sent
     * anywhere yet; the UI field stays because the delivered screen isn't
     * being rewritten, but nothing should assume it's persisted.
     */
    post(companyId: UUID, draft: ShipmentDraft, idempotencyKey: string): Promise<void>;
  };
}
