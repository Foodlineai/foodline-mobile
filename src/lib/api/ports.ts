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
    /** `record_current_proof_of_delivery_exact` — idempotent, optimistic-concurrency guarded. */
    recordProofOfDelivery(
      companyId: UUID,
      input: {
        stopId: UUID;
        stopRowVersion: number;
        recipientName: string | null;
        signatureCaptured: boolean;
        photoCaptured: boolean;
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
}
