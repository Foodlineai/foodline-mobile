import type { CustomerDetail } from './types';

/**
 * Demo fixture. Runs under EXPO_PUBLIC_DEMO_MODE=1 with no backend and no
 * WorkOS — which is what lets the app be demoed on a plane, in a hotel with bad
 * wifi, and in front of a customer when staging is down.
 *
 * Every new screen ships its fixture in the same commit as its live adapter.
 */
export const demoCustomer: CustomerDetail = {
  id: 'cust-cedar-grove',
  name: 'Cedar Grove Catering',
  tierLabel: 'Tier 2 pricing',
  standing: { label: 'Net 30 · in good standing', tone: 'ok' },
  figures: [
    { label: 'Credit limit', value: '$25,000' },
    { label: 'Available', value: '$18,400', tone: 'ok' },
    { label: 'Avg order', value: '$2,290' },
  ],
  frequencyWeeks: 5,
  frequentItems: [
    {
      id: 'itm-roma',
      name: 'Roma tomatoes',
      packSize: '6 × 5 lb case',
      weeklyLabel: '12 cases a week',
      weeks: [true, true, true, true, true],
    },
    {
      id: 'itm-spinach',
      name: 'Baby spinach',
      packSize: '4 × 2.5 lb case',
      weeklyLabel: '8 cases a week',
      weeks: [true, false, true, true, true],
    },
    {
      id: 'itm-milk',
      name: 'Whole milk',
      packSize: '4 × 1 gal case',
      weeklyLabel: '6 cases a week',
      weeks: [true, true, true, false, true],
    },
    {
      id: 'itm-oil',
      name: 'Olive oil, extra virgin',
      packSize: '12 × 820 g case',
      weeklyLabel: '4 cases a week',
      weeks: [false, true, true, true, true],
    },
  ],
  recentOrders: [
    {
      id: 'so-1042',
      reference: 'SO-1042',
      placedLabel: 'Sep 16 · 11 lines',
      total: '$2,412.80',
      status: { label: 'On road', tone: 'info' },
    },
    {
      id: 'so-1021',
      reference: 'SO-1021',
      placedLabel: 'Sep 9 · 11 lines',
      total: '$2,188.40',
      status: { label: 'Delivered', tone: 'ok' },
    },
  ],
};

/** A customer with no repeat pattern — exercises the empty state. */
export const demoCustomerNoPattern: CustomerDetail = {
  ...demoCustomer,
  id: 'cust-new',
  name: 'Harbour Foods',
  frequencyWeeks: 0,
  frequentItems: [],
  recentOrders: demoCustomer.recentOrders.slice(0, 1),
};
