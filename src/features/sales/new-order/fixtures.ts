import type { CatalogItem } from './types';

/**
 * Sale-price catalog. Unlike P1's vendor catalog, this genuinely can't be
 * built from real data yet: `Item` (product_directory_snapshot) carries
 * `lastCost` — what we pay a vendor — not a customer-facing sale price, and
 * no RPC returning one is confirmed. Showing `lastCost` as if it were a
 * price would be wrong, not just unconfirmed, so this stays a fixture
 * rather than a real-item list with a fabricated markup.
 */
export const demoCatalog: CatalogItem[] = [
  { id: 'c-roma', name: 'Roma tomatoes', packSize: '6 × 5 lb', uom: 'case', unitPrice: 34.0 },
  { id: 'c-spinach', name: 'Baby spinach', packSize: '4 × 2.5 lb', uom: 'case', unitPrice: 27.5 },
  { id: 'c-lettuce', name: 'Green leaf lettuce', packSize: '24 ct', uom: 'case', unitPrice: 24.0 },
  { id: 'c-milk', name: 'Whole milk', packSize: '4 × 1 gal', uom: 'case', unitPrice: 19.9 },
  { id: 'c-oil', name: 'Olive oil, extra virgin', packSize: '12 × 820 g', uom: 'case', unitPrice: 108.0 },
];

/**
 * Demo commit. Same contract as P1's `demoCommitPo`: fails once on a
 * specific customer to exercise the retry path (same idempotency key, no
 * duplicate order) in demo mode rather than discovering it on a delivery
 * route.
 */
let failedOnce = false;
export async function demoCommitSalesOrder(customerId: string): Promise<string> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 900);
  });
  if (customerId === 'c1' && !failedOnce) {
    failedOnce = true;
    throw new Error('The network dropped before the order was confirmed.');
  }
  return `SO-${1050 + Math.floor(Math.random() * 90)}`;
}
