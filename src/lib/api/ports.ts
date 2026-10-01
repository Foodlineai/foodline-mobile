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
import type { DraftedPurchaseOrder } from '@/features/routines/types';
import type { ShipmentDraft, ShipmentTarget } from '@/features/shipments/types';

/**
 * The single seam between the app and the ERP.
 *
 * Live implementation calls the `erp_api` / public RPCs on the shared Supabase
 * project. The demo implementation serves fixtures. Screens depend only on this.
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
  };
  purchaseOrders: {
    list(companyId: UUID, params?: { openOnly?: boolean }): Promise<PurchaseOrder[]>;
    /** Powers the Purchasing module screen (mockup 03). */
    summary(companyId: UUID): Promise<PurchasingSummary>;
  };
  sales: {
    /** `get_current_sales_orders_workspace` — one call for the Sales screen. */
    summary(companyId: UUID): Promise<SalesSummary>;
    customers(companyId: UUID): Promise<Customer[]>;
  };
  routes: {
    /** `get_current_delivery_route_workspace` — today's assigned route. */
    today(companyId: UUID): Promise<DeliveryRoute | null>;
    /** `get_current_delivery_stop_detail` */
    stop(companyId: UUID, stopId: UUID): Promise<StopDetail | null>;
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
