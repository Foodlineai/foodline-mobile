import type { ItemsFilter, StockItem } from './types';

export const demoItemFilters: ItemsFilter[] = [
  { id: 'all', label: 'All items' },
  { id: 'below-par', label: 'Below par' },
  { id: 'short-dated', label: 'Short dated' },
  { id: 'chilled', label: 'Chilled' },
];

export const demoItems: StockItem[] = [
  {
    id: 'itm-roma',
    name: 'Roma tomatoes',
    packSize: '6 × 5 lb',
    uom: 'case',
    location: 'CHILL-A03',
    onHand: 24,
    availableLabel: '18 available',
  },
  {
    id: 'itm-shortrib',
    name: 'Beef short rib, boneless',
    packSize: 'avg 12 lb',
    uom: 'catch-weight',
    location: 'FREEZE-B01',
    onHand: 9,
    availableLabel: '108.4 lb',
  },
  {
    id: 'itm-oil',
    name: 'Olive oil, extra virgin',
    packSize: '12 × 820 g',
    uom: 'case',
    location: 'DRY-C12',
    onHand: 46,
    availableLabel: '46 available',
  },
  {
    id: 'itm-spinach',
    name: 'Baby spinach',
    packSize: '4 × 2.5 lb',
    uom: 'case',
    location: 'CHILL-A03',
    onHand: 12,
    availableLabel: '4 available',
    flag: 'expiring',
    expiryLabel: 'Expires in 2 days',
  },
  {
    id: 'itm-milk',
    name: 'Whole milk',
    packSize: '4 × 1 gal',
    uom: 'case',
    location: 'CHILL-B02',
    onHand: 31,
    availableLabel: '27 available',
  },
  {
    id: 'itm-lettuce',
    name: 'Green leaf lettuce',
    packSize: '24 ct',
    uom: 'case',
    location: 'CHILL-A01',
    onHand: 3,
    availableLabel: 'Below par',
    flag: 'below-par',
  },
];
