import type { CatalogItem, VendorOption } from './types';

export const demoVendors: VendorOption[] = [
  { id: 'v-fresh-valley', name: 'Fresh Valley Produce', terms: 'Net 30', leadTimeDays: 2 },
  { id: 'v-harvest', name: 'Harvest Produce Co', terms: 'Net 15', leadTimeDays: 3 },
  { id: 'v-green-acres', name: 'Green Acres Farms', terms: 'Net 30', leadTimeDays: 1 },
  { id: 'v-coastal', name: 'Coastal Dairy', terms: 'Net 21', leadTimeDays: 2 },
];

const CATALOG: Record<string, CatalogItem[]> = {
  'v-fresh-valley': [
    { id: 'c-roma', name: 'Roma tomatoes', packSize: '6 × 5 lb', uom: 'case', unitPrice: 28.4 },
    { id: 'c-spinach', name: 'Baby spinach', packSize: '4 × 2.5 lb', uom: 'case', unitPrice: 22.15 },
    { id: 'c-lettuce', name: 'Green leaf lettuce', packSize: '24 ct', uom: 'case', unitPrice: 19.8 },
    { id: 'c-pepper', name: 'Red bell peppers', packSize: '5 lb', uom: 'case', unitPrice: 24.0 },
  ],
  'v-harvest': [
    { id: 'c-carrot', name: 'Carrots, jumbo', packSize: '50 lb', uom: 'case', unitPrice: 31.5 },
    { id: 'c-onion', name: 'Yellow onions', packSize: '50 lb', uom: 'case', unitPrice: 26.75 },
  ],
  'v-green-acres': [
    { id: 'c-apple', name: 'Gala apples', packSize: '40 lb', uom: 'case', unitPrice: 38.2 },
  ],
  'v-coastal': [
    { id: 'c-milk', name: 'Whole milk', packSize: '4 × 1 gal', uom: 'case', unitPrice: 16.4 },
    { id: 'c-butter', name: 'Unsalted butter', packSize: '36 × 1 lb', uom: 'case', unitPrice: 96.0 },
  ],
};

export function demoCatalogFor(vendorId: string): CatalogItem[] {
  return CATALOG[vendorId] ?? [];
}

/**
 * Demo commit. Mirrors the real contract: it takes an Attempt and returns a
 * reference. It deliberately fails the first time on one vendor so the retry
 * path — same idempotency key, no duplicate order — is exercised in demo mode
 * rather than discovered on a warehouse floor.
 */
let failedOnce = false;
export async function demoCommitPo(vendorId: string): Promise<string> {
  await new Promise<void>((resolve) => { setTimeout(resolve, 900); });
  if (vendorId === 'v-coastal' && !failedOnce) {
    failedOnce = true;
    throw new Error('The network dropped before the order was confirmed.');
  }
  return `PO-${2090 + Math.floor(Math.random() * 9)}`;
}
