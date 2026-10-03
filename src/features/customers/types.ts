import type { Tone } from '../../components/primitives';

/** View-model types. These are what screens render — never a raw RPC payload. */

export type FrequentItem = {
  id: string;
  name: string;
  /** "6 × 5 lb", "820 g", "avg 12 lb" — never folded into the name. */
  packSize: string;
  /** "12 cases a week" */
  weeklyLabel: string;
  /** Oldest first. true = ordered that week. Length drives the strip. */
  weeks: boolean[];
};

export type RecentOrder = {
  id: string;
  reference: string;
  placedLabel: string;
  total: string;
  status: { label: string; tone: Tone };
};

export type CustomerDetail = {
  id: string;
  name: string;
  tierLabel: string;
  standing?: { label: string; tone: Tone };
  figures: { label: string; value: string; tone?: 'ok' }[];
  frequencyWeeks: number;
  frequentItems: FrequentItem[];
  recentOrders: RecentOrder[];
};
