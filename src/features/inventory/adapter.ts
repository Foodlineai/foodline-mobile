import type { Item } from '@/lib/api';
import type { ItemsFilter, StockItem } from './types';

/**
 * Maps this app's `Item` (already live via `product_directory_snapshot`) onto
 * the delivered `ItemsScreen`'s view model.
 *
 * `catchWeight` and `binLocation` are real, confirmed fields on the live RPC
 * (29 Sep, against the ERP source) — this is the fix the 18 Sep review
 * actually asked for, not fixture polish. `packSize` ("6 × 5 lb") has no
 * source anywhere on this RPC — confirmed absent, not unconfirmed — so it
 * falls back to the UOM code rather than a fabricated dimension string.
 */
export function toStockItem(item: Item): StockItem {
  const flag: StockItem['flag'] = item.expiringSoon
    ? 'expiring'
    : item.status === 'low' || item.status === 'out'
      ? 'below-par'
      : undefined;

  return {
    id: item.id,
    name: item.name,
    // No pack-size field exists on product_directory_snapshot — confirmed,
    // not guessed. The UOM code is the nearest real thing to show.
    packSize: item.uom,
    uom: item.catchWeight ? 'catch-weight' : 'case',
    location: item.binLocation ?? undefined,
    onHand: item.onHand,
    availableLabel:
      item.status === 'out'
        ? 'Out of stock'
        : item.status === 'low'
          ? 'Below par'
          : `${item.onHand} ${item.uom} on hand`,
    flag,
    // No expiry date on this RPC — confirmed absent. A generic tag, not a
    // fabricated date.
    expiryLabel: item.expiringSoon ? 'Expiring soon' : undefined,
  };
}

export const ITEM_FILTERS: ItemsFilter[] = [
  { id: 'all', label: 'All items' },
  { id: 'below-par', label: 'Below par' },
  { id: 'expiring', label: 'Expiring' },
];

export function matchesFilter(item: StockItem, filterId: string): boolean {
  if (filterId === 'below-par') return item.flag === 'below-par';
  if (filterId === 'expiring') return item.flag === 'expiring';
  return true;
}
