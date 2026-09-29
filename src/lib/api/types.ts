/**
 * Domain types for the mobile client.
 *
 * Deliberately OUR shapes, not raw RPC payloads. Adapters map into these, so an
 * ERP payload change is absorbed in one mapper instead of across every screen.
 */

export type UUID = string;

export type Company = {
  id: UUID;
  name: string;
  slug: string;
  roleKey: string;
  permissionKeys: string[];
};

/** Mirrors `application_session_context` / `erpSessionSchema` in the web ERP. */
export type Session = {
  actorId: UUID;
  companyId: UUID | null;
  companies: Company[];
};

export type StockStatus = 'ok' | 'low' | 'out' | 'over';

export type Item = {
  id: UUID;
  sku: string;
  name: string;
  category: string | null;
  uom: string;
  onHand: number;
  onOrder: number;
  parLevel: number | null;
  daysCover: number | null;
  lastCost: number | null;
  primaryVendorName: string | null;
  status: StockStatus;
  /** `product.catch_weight` on `product_directory_snapshot` — confirmed real,
   * not a guess. False means sold/tracked by a fixed case count. */
  catchWeight: boolean;
  /** `warehouseBalances[0].preferredBin.code` — confirmed real, permission-
   * gated (null when the actor lacks inventory.read), so treat absence as
   * "not shown", not "no bin". */
  binLocation: string | null;
  /** From the RPC's combined `health` enum (`reorder_soon`, `stockout_risk`,
   * `expiring_lot`, `margin_and_expiry`, ...) — a single status, not two
   * independent flags, and it carries no date. */
  expiringSoon: boolean;
};

export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';

export type PurchaseOrder = {
  id: UUID;
  number: string;
  vendorId: UUID;
  vendorName: string;
  status: PurchaseOrderStatus;
  expectedAt: string | null;
  total: number | null;
  lineCount: number;
};

export type HubMetric = {
  key: string;
  label: string;
  value: string;
  delta: number | null;
  tone: 'neutral' | 'good' | 'warn' | 'bad';
};

/**
 * One line waiting to be received, from `get_governed_scanner_receiving_queue`.
 * Quantities are base-UOM numerics returned as strings by Postgres.
 */
export type ReceivingTask = {
  taskId: UUID;
  goodsReceiptId: UUID;
  purchaseOrderVersionLineId: UUID;
  productId: UUID;
  productSku: string;
  productName: string;
  lineNumber: number;
  uomCode: string;
  orderedBaseQuantity: number;
  priorReceivedBaseQuantity: number;
  remainingBaseQuantity: number;
  receiptDocumentNumber: string;
  receiptRowVersion: number;
  isEligible: boolean;
  blockerCode: string | null;
  tracksLots: boolean;
  tracksExpiry: boolean;
  catchWeight: boolean;
  temperatureRequired: boolean;
};

/** A live scanner session — `start_scanner_session` / `close_scanner_session`. */
export type ScannerSession = {
  sessionId: UUID;
  rowVersion: number;
  warehouseId: UUID;
};

/** A row under "Needs you" — work waiting on this actor. */
export type ActionItem = {
  key: string;
  title: string;
  /** Which workspace it belongs to, shown as the subtitle. */
  workspace: string;
  count: number;
  route: string | null;
};

/** A row under "Across your company" — status, not a to-do. */
export type ActivityLine = {
  key: string;
  label: string;
  detail: string;
  route: string | null;
};

/** Everything the Home tab renders in one round trip. */
export type HomeSummary = {
  greetingName: string;
  tiles: HubMetric[];
  needsYou: ActionItem[];
  acrossCompany: ActivityLine[];
  aiSummary: { body: string; actionLabel: string } | null;
};

/** A warehouse the actor may receive into — `list_receiving_location_warehouses`. */
export type ReceivingWarehouse = {
  id: UUID;
  code: string;
  name: string;
  /** Default receiving bin, when the ERP has one configured. */
  receivingBinId: UUID | null;
};

export type GoodsReceiptStatus = 'open' | 'in_progress' | 'on_hold' | 'posted';

/** An in-progress receipt on the dock — `get_governed_receiving_dock`. */
export type DockReceipt = {
  goodsReceiptId: UUID;
  documentNumber: string;
  warehouseId: UUID;
  vendorName: string;
  purchaseOrderNumber: string | null;
  status: GoodsReceiptStatus;
  rowVersion: number;
  /** Lines still to receive; null when the dock payload does not carry it. */
  openLineCount: number | null;
  arrivedAt: string | null;
};

/* ---------------------------------------------------------------- sales */

export type SalesOrderState = 'draft' | 'confirmed' | 'picking' | 'out_for_delivery' | 'delivered' | 'short';

export type SalesOrder = {
  id: UUID;
  number: string;
  customerId: UUID;
  customerName: string;
  state: SalesOrderState;
  /** Short human note on why it needs attention, when it does. */
  attention: string | null;
  total: number | null;
  promisedFor: string | null;
};

export type Customer = {
  id: UUID;
  name: string;
  /** e.g. "Riverside, GA" — whatever the workspace payload carries. */
  subtitle: string | null;
};

export type SalesSummary = {
  ordersNeedingAttention: SalesOrder[];
  customers: Customer[];
  aiInsight: { body: string; actionLabel: string } | null;
};

/* --------------------------------------------------------- purchasing */

export type PurchasingSummary = {
  approvalCount: number;
  supplyIssueCount: number;
  /** The single most urgent supply problem, shown as the amber card. */
  topIssue: {
    productName: string;
    ordersAffected: number;
    neededQuantity: number;
    incomingQuantity: number;
    uom: string;
  } | null;
  awaitingReview: PurchaseOrder[];
  incomingToday: PurchaseOrder[];
};

/* ------------------------------------------------------------- routes */

export type StopState = 'pending' | 'en_route' | 'arrived' | 'complete' | 'failed';

export type DeliveryStop = {
  id: UUID;
  sequence: number;
  customerName: string;
  address: string;
  windowLabel: string | null;
  note: string | null;
  state: StopState;
  phone: string | null;
  rowVersion: number;
};

export type DeliveryRoute = {
  id: UUID;
  code: string;
  vehicleLabel: string | null;
  stopsTotal: number;
  stopsComplete: number;
  stops: DeliveryStop[];
};

export type ShipmentLine = {
  id: UUID;
  productName: string;
  quantityLabel: string;
  state: string;
};

export type StopDetail = {
  stop: DeliveryStop;
  lines: ShipmentLine[];
};
