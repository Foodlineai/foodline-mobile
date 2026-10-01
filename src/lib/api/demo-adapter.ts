import type { FoodlineApi } from './ports';
import type {
  ActionItem,
  ActivityLine,
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
  SalesOrder,
  SalesSummary,
  Session,
  StopDetail,
} from './types';
import { demoCustomer, demoCustomerNoPattern } from '@/features/customers/fixtures';
import { demoItemDetails } from '@/features/items/detail/fixtures';
import { demoPurchaseOrderDetails } from '@/features/purchasing/order-detail/fixtures';
import { demoDraftedPO } from '@/features/routines/fixtures';
import { demoSalesOrderDetails, demoSalesOrderFulfillments } from '@/features/sales/order-detail/fixtures';
import { demoVendorDetails } from '@/features/vendors/fixtures';

const COMPANY_ID = '00000000-0000-4000-8000-000000000001';

const SESSION: Session = {
  actorId: '00000000-0000-4000-8000-0000000000aa',
  companyId: COMPANY_ID,
  companies: [
    {
      id: COMPANY_ID,
      name: 'Atlanta Fresh Distribution',
      slug: 'atlanta-fresh',
      roleKey: 'buyer',
      permissionKeys: ['purchasing.read', 'inventory.read', 'receiving.scan'],
    },
  ],
};

const ITEMS: Item[] = [
  { id: 'i1', sku: 'PRD-1042', name: 'Romaine Hearts, 24ct', category: 'Produce', uom: 'CS', onHand: 18, onOrder: 40, parLevel: 60, daysCover: 2.1, lastCost: 32.5, primaryVendorName: 'Valley Greens', status: 'low', catchWeight: false, binLocation: 'CHILL-A03', expiringSoon: false },
  { id: 'i2', sku: 'DRY-2210', name: 'Olive Oil, Extra Virgin 4/1gal', category: 'Dry Goods', uom: 'CS', onHand: 96, onOrder: 0, parLevel: 60, daysCover: 22.4, lastCost: 88, primaryVendorName: 'Mediterra Imports', status: 'over', catchWeight: false, binLocation: 'DRY-B12', expiringSoon: false },
  { id: 'i3', sku: 'PRO-0771', name: 'Chicken Breast, Boneless 40lb', category: 'Protein', uom: 'CS', onHand: 0, onOrder: 24, parLevel: 30, daysCover: 0, lastCost: 104.75, primaryVendorName: 'Southern Poultry Co', status: 'out', catchWeight: true, binLocation: 'FRZ-C02', expiringSoon: false },
  { id: 'i4', sku: 'DAI-0310', name: 'Heavy Cream 12/qt', category: 'Dairy', uom: 'CS', onHand: 44, onOrder: 12, parLevel: 40, daysCover: 6.8, lastCost: 41.2, primaryVendorName: 'Peachtree Dairy', status: 'ok', catchWeight: false, binLocation: 'CHILL-A07', expiringSoon: true },
  { id: 'i5', sku: 'FRZ-5580', name: 'Shoestring Fries 6/5lb', category: 'Frozen', uom: 'CS', onHand: 7, onOrder: 0, parLevel: 25, daysCover: 1.4, lastCost: 27.9, primaryVendorName: 'Northline Frozen', status: 'low', catchWeight: false, binLocation: 'FRZ-C08', expiringSoon: false },
  { id: 'i6', sku: 'PRD-1188', name: 'Roma Tomatoes 25lb', category: 'Produce', uom: 'CS', onHand: 31, onOrder: 20, parLevel: 30, daysCover: 4.2, lastCost: 24, primaryVendorName: 'Valley Greens', status: 'ok', catchWeight: true, binLocation: 'CHILL-A03', expiringSoon: true },
];

const ORDERS: PurchaseOrder[] = [
  { id: 'po1', number: 'PO-4471', vendorId: 'v1', vendorName: 'Valley Greens', status: 'sent', expectedAt: '2026-09-23', total: 2140, lineCount: 2 },
  { id: 'po2', number: 'PO-4468', vendorId: 'v2', vendorName: 'Southern Poultry Co', status: 'partial', expectedAt: '2026-09-22', total: 2514, lineCount: 1 },
  { id: 'po3', number: 'PO-4455', vendorId: 'v3', vendorName: 'Peachtree Dairy', status: 'received', expectedAt: '2026-09-19', total: 494.4, lineCount: 1 },
];

const METRICS: HubMetric[] = [
  { key: 'below-par', label: 'Items below par', value: '3', delta: -25, tone: 'warn' },
  { key: 'open-pos', label: 'Open POs', value: '2', delta: 0, tone: 'neutral' },
  { key: 'arriving', label: 'Arriving today', value: '1', delta: null, tone: 'neutral' },
  { key: 'spend', label: 'Week spend', value: '$14.2K', delta: 8, tone: 'good' },
];

const TASKS: ReceivingTask[] = [
  { taskId: 't1', goodsReceiptId: 'gr1', purchaseOrderVersionLineId: 'povl1', productId: 'i1', productSku: 'PRD-1042', productName: 'Romaine Hearts, 24ct', lineNumber: 1, uomCode: 'CS', orderedBaseQuantity: 40, priorReceivedBaseQuantity: 0, remainingBaseQuantity: 40, receiptDocumentNumber: 'GR-2201', receiptRowVersion: 3, isEligible: true, blockerCode: null, tracksLots: true, tracksExpiry: true, catchWeight: false, temperatureRequired: true },
  { taskId: 't2', goodsReceiptId: 'gr1', purchaseOrderVersionLineId: 'povl2', productId: 'i6', productSku: 'PRD-1188', productName: 'Roma Tomatoes 25lb', lineNumber: 2, uomCode: 'CS', orderedBaseQuantity: 20, priorReceivedBaseQuantity: 8, remainingBaseQuantity: 12, receiptDocumentNumber: 'GR-2201', receiptRowVersion: 3, isEligible: true, blockerCode: null, tracksLots: false, tracksExpiry: false, catchWeight: false, temperatureRequired: false },
  { taskId: 't3', goodsReceiptId: 'gr1', purchaseOrderVersionLineId: 'povl3', productId: 'i3', productSku: 'PRO-0771', productName: 'Chicken Breast, Boneless 40lb', lineNumber: 3, uomCode: 'CS', orderedBaseQuantity: 24, priorReceivedBaseQuantity: 24, remainingBaseQuantity: 0, receiptDocumentNumber: 'GR-2201', receiptRowVersion: 3, isEligible: false, blockerCode: 'line_complete', tracksLots: true, tracksExpiry: true, catchWeight: true, temperatureRequired: true },
];

const BARCODES: Record<string, string> = {
  '0012345678905': 't1',
  '0055512345678': 't2',
};

const NEEDS_YOU: ActionItem[] = [
  { key: 'quotes', title: '6 quotes to confirm', workspace: 'Sales & Customers', count: 6, route: null },
  { key: 'approvals', title: '2 purchase approvals', workspace: 'Purchasing', count: 2, route: '/purchasing' },
  { key: 'exceptions', title: '3 delivery exceptions', workspace: 'Routes & Delivery', count: 3, route: null },
];

const ACROSS_COMPANY: ActivityLine[] = [
  { key: 'warehouse', label: 'Warehouse', detail: '8 picks in progress', route: '/receiving' },
  { key: 'delivery', label: 'Delivery', detail: '24 of 36 stops complete', route: null },
];

const HOME: HomeSummary = {
  greetingName: 'Chris',
  tiles: [
    { key: 'open-orders', label: 'Open orders', value: '39', delta: null, tone: 'neutral' },
    { key: 'routes-active', label: 'Routes active', value: '4', delta: null, tone: 'neutral' },
  ],
  needsYou: NEEDS_YOU,
  acrossCompany: ACROSS_COMPANY,
  aiSummary: {
    body: "Two incoming deliveries may affect today's orders.",
    actionLabel: 'Review impact',
  },
};


const WAREHOUSES: ReceivingWarehouse[] = [
  { id: 'wh-atl', code: 'ATL', name: 'Atlanta warehouse', receivingBinId: 'bin-atl-recv' },
  { id: 'wh-sav', code: 'SAV', name: 'Savannah cross-dock', receivingBinId: 'bin-sav-recv' },
];

const DOCK: DockReceipt[] = [
  { goodsReceiptId: 'gr1', documentNumber: 'GR-2201', warehouseId: 'wh-atl', vendorName: 'Valley Greens', purchaseOrderNumber: 'PO-4471', status: 'in_progress', rowVersion: 3, openLineCount: 2, arrivedAt: '2026-09-23T07:12:00Z' },
  { goodsReceiptId: 'gr2', documentNumber: 'GR-2202', warehouseId: 'wh-atl', vendorName: 'Southern Poultry Co', purchaseOrderNumber: 'PO-4468', status: 'open', rowVersion: 1, openLineCount: 1, arrivedAt: '2026-09-23T08:40:00Z' },
  { goodsReceiptId: 'gr3', documentNumber: 'GR-2199', warehouseId: 'wh-sav', vendorName: 'Northline Frozen', purchaseOrderNumber: 'PO-4460', status: 'open', rowVersion: 1, openLineCount: 4, arrivedAt: '2026-09-23T06:05:00Z' },
];


const SALES_ORDERS: SalesOrder[] = [
  { id: 'so1', number: 'SO-1048', customerId: 'c1', customerName: 'Riverside Market', state: 'short', attention: 'Review alternatives', total: 1840.25, promisedFor: '2026-09-23' },
  { id: 'so2', number: 'SO-1042', customerId: 'c2', customerName: 'Cedar Grove', state: 'out_for_delivery', attention: 'View delivery progress', total: 964.0, promisedFor: '2026-09-23' },
  { id: 'so3', number: 'SO-1039', customerId: 'c3', customerName: 'Hillside Deli', state: 'delivered', attention: null, total: 412.8, promisedFor: '2026-09-22' },
];

const CUSTOMERS: Customer[] = [
  { id: 'c2', name: 'Cedar Grove Catering', subtitle: 'Open customer details' },
  { id: 'c1', name: 'Riverside Market', subtitle: 'Open customer details' },
  { id: 'c3', name: 'Hillside Deli', subtitle: 'Open customer details' },
];

const SALES: SalesSummary = {
  ordersNeedingAttention: SALES_ORDERS.filter((o) => o.attention !== null),
  customers: CUSTOMERS,
  aiInsight: { body: 'Riverside has a shortage to resolve.', actionLabel: 'Review order' },
};

const PURCHASING: PurchasingSummary = {
  approvalCount: 2,
  supplyIssueCount: 3,
  topIssue: {
    productName: 'Roma tomatoes',
    ordersAffected: 3,
    neededQuantity: 18,
    incomingQuantity: 8,
    uom: 'cases',
  },
  awaitingReview: [
    { id: 'po4', number: 'PO-2084', vendorId: 'v4', vendorName: 'Fresh Valley', status: 'draft', expectedAt: '2026-09-24', total: 1260, lineCount: 6 },
  ],
  incomingToday: [
    { id: 'po5', number: 'PO-2079', vendorId: 'v5', vendorName: 'Green Acres', status: 'sent', expectedAt: '2026-09-23', total: 890.5, lineCount: 4 },
  ],
};

const ROUTE: DeliveryRoute = {
  id: 'rt1',
  code: 'RTE-000000012',
  vehicleLabel: 'Truck 04',
  stopsTotal: 4,
  stopsComplete: 2,
  stops: [
    { id: 's1', sequence: 1, customerName: 'Morning Bakery', address: '12 Auburn Ave, Atlanta', windowLabel: '07:00–07:30', state: 'completed', rowVersion: 1 },
    { id: 's2', sequence: 2, customerName: 'Hillside Deli', address: '88 Edgewood Ave, Atlanta', windowLabel: '08:15–08:45', state: 'completed', rowVersion: 1 },
    { id: 's3', sequence: 3, customerName: 'Cedar Grove Catering', address: '180 Peachtree St, Atlanta', windowLabel: '10:00–10:30', state: 'arrived', rowVersion: 1 },
    { id: 's4', sequence: 4, customerName: 'Riverside Market', address: '420 Marietta St, Atlanta', windowLabel: '11:00–11:30', state: 'planned', rowVersion: 1 },
  ],
};

const STOP_ROUTE_IDS: Record<string, string> = { s1: 'rt1', s2: 'rt1', s3: 'rt1', s4: 'rt1' };
const STOP_ROUTE_VERSION = 1;

const STOP_LINES: Record<string, StopDetail['lines']> = {
  s3: [
    { id: 'sl1', productName: 'Roma tomatoes', quantity: 4, baseQuantity: 4 },
    { id: 'sl2', productName: 'Baby spinach', quantity: 2, baseQuantity: 2 },
    { id: 'sl3', productName: 'Whole milk', quantity: 6, baseQuantity: 6 },
  ],
};

const wait = (ms = 180) => new Promise((r) => setTimeout(r, ms));
let signedIn = true;
const usedIdempotencyKeys = new Set<string>();

export const demoApi: FoodlineApi = {
  session: {
    async signIn() {
      await wait(400);
      signedIn = true;
    },
    async signOut() {
      await wait(80);
      signedIn = false;
    },
    async resolve() {
      await wait(120);
      return signedIn ? SESSION : null;
    },
  },
  home: {
    async summary() {
      await wait();
      return HOME;
    },
  },
  hub: {
    async metrics() {
      await wait();
      return METRICS;
    },
  },
  items: {
    async list(_companyId, params) {
      await wait();
      let rows = ITEMS;
      if (params?.onlyBelowPar) rows = rows.filter((i) => i.status === 'low' || i.status === 'out');
      const q = params?.search?.trim().toLowerCase();
      if (q) rows = rows.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
      return rows;
    },
    async detail(_companyId, productId) {
      await wait();
      return demoItemDetails[productId] ?? null;
    },
  },
  purchaseOrders: {
    async list(_companyId, params) {
      await wait();
      return params?.openOnly === false
        ? ORDERS
        : ORDERS.filter((o) => o.status !== 'received' && o.status !== 'cancelled');
    },
    async summary() {
      await wait();
      return PURCHASING;
    },
    async detail(_companyId, purchaseOrderId) {
      await wait();
      return demoPurchaseOrderDetails[purchaseOrderId] ?? null;
    },
  },
  sales: {
    async summary() {
      await wait();
      return SALES;
    },
    async customers() {
      await wait();
      return CUSTOMERS;
    },
    async orderDetail(_companyId, salesOrderId) {
      await wait();
      return demoSalesOrderDetails[salesOrderId] ?? null;
    },
    async orderFulfillment(_companyId, salesOrderId) {
      await wait();
      return demoSalesOrderFulfillments[salesOrderId] ?? null;
    },
    async cancelRemainder(_companyId, input) {
      await wait(220);
      if (usedIdempotencyKeys.has(input.idempotencyKey)) return;
      const order = demoSalesOrderDetails[input.salesOrderId];
      if (order && order.rowVersion !== String(input.expectedOrderRowVersion)) {
        throw new Error('This order changed since you loaded it. Reload and try again.');
      }
      usedIdempotencyKeys.add(input.idempotencyKey);
    },
    async allocateBackorder(_companyId, input) {
      await wait(220);
      if (usedIdempotencyKeys.has(input.idempotencyKey)) return;
      usedIdempotencyKeys.add(input.idempotencyKey);
    },
  },
  vendors: {
    async detail(_companyId, vendorId) {
      await wait();
      return demoVendorDetails[vendorId] ?? null;
    },
  },

  routes: {
    async today() {
      await wait();
      return ROUTE;
    },
    async stop(_companyId, stopId) {
      await wait();
      const stop = ROUTE.stops.find((s2) => s2.id === stopId);
      if (!stop) return null;
      return {
        stop,
        routeId: STOP_ROUTE_IDS[stopId] ?? ROUTE.id,
        routeRowVersion: STOP_ROUTE_VERSION,
        lines: STOP_LINES[stopId] ?? [],
      };
    },
    async arriveAtStop(_companyId, input) {
      await wait(180);
      if (usedIdempotencyKeys.has(input.idempotencyKey)) return;
      const stop = ROUTE.stops.find((s2) => s2.id === input.stopId);
      if (!stop) throw new Error('Stop not found');
      if (stop.rowVersion !== input.expectedRowVersion) {
        throw new Error('This stop changed since you loaded it. Reload and try again.');
      }
      usedIdempotencyKeys.add(input.idempotencyKey);
      stop.rowVersion += 1;
      stop.state = 'arrived';
    },
    async recordProofOfDelivery(_companyId, input) {
      await wait(220);
      if (usedIdempotencyKeys.has(input.idempotencyKey)) return; // already recorded — same discipline as a live retry
      const stop = ROUTE.stops.find((s2) => s2.id === input.stopId);
      if (!stop) throw new Error('Stop not found');
      if (stop.rowVersion !== input.expectedStopVersion) {
        throw new Error('This stop changed since you loaded it. Reload and try again.');
      }
      usedIdempotencyKeys.add(input.idempotencyKey);
      stop.rowVersion += 1;
      if (stop.state !== 'completed') {
        stop.state = 'completed';
        ROUTE.stopsComplete += 1;
      }
    },
  },

  receiving: {
    async warehouses() {
      await wait();
      return WAREHOUSES;
    },
    async dock(_companyId, warehouseId) {
      await wait();
      const open = DOCK.filter((r) => r.status !== 'posted');
      return warehouseId ? open.filter((r) => r.warehouseId === warehouseId) : open;
    },
    async startSession(_companyId, warehouseId) {
      await wait(250);
      return { sessionId: 'demo-session', rowVersion: 1, warehouseId };
    },
    async closeSession() {
      await wait(100);
    },
    async queue(_companyId, goodsReceiptId) {
      await wait();
      return TASKS.filter((t) => t.goodsReceiptId === goodsReceiptId);
    },
    async submitScan(_companyId, input) {
      await wait(160);
      const taskId = BARCODES[input.rawValue];
      if (!taskId) throw new Error(`No open receiving line matches barcode ${input.rawValue}`);
      const task = TASKS.find((t) => t.taskId === taskId);
      if (!task) throw new Error('Task not found');
      if (task.remainingBaseQuantity <= 0) throw new Error(`${task.productName} is already fully received`);
      task.priorReceivedBaseQuantity += 1;
      task.remainingBaseQuantity -= 1;
    },
  },

  customers: {
    async detail(_companyId, customerId) {
      await wait();
      // 'c1' is Riverside Market in the sales-customers fixture (a separate
      // demo dataset authored before this one) — mapped here so tapping it
      // from Sales still exercises the no-repeat-pattern empty state instead
      // of always landing on Cedar Grove.
      return customerId === 'c1' || customerId === demoCustomerNoPattern.id
        ? demoCustomerNoPattern
        : demoCustomer;
    },
  },

  routines: {
    async approveDraftedPurchaseOrder(_companyId, input) {
      await wait(220);
      if (usedIdempotencyKeys.has(input.idempotencyKey)) return;
      if (input.draft.rowVersion !== demoDraftedPO.rowVersion) {
        throw new Error('This draft changed since you loaded it. Reload and try again.');
      }
      usedIdempotencyKeys.add(input.idempotencyKey);
    },
  },

  shipments: {
    async post(_companyId, _draft, idempotencyKey) {
      await wait(220);
      if (usedIdempotencyKeys.has(idempotencyKey)) return;
      usedIdempotencyKeys.add(idempotencyKey);
    },
  },
};

/** Demo-only: lets the receiving screen resolve a scan to a task for display. */
export function demoTaskForBarcode(barcode: string): ReceivingTask | null {
  const id = BARCODES[barcode];
  return id ? (TASKS.find((t) => t.taskId === id) ?? null) : null;
}
