import type { Tone } from '../../components/primitives';

export type AttentionOrder = {
  id: string;
  reference: string;
  customerName: string;
  /** Why it needs attention, in the rep's words. */
  note: string;
  status: { label: string; tone: Tone };
};

export type CustomerSummary = {
  id: string;
  name: string;
  initials: string;
  subtitle: string;
};

export type SalesHome = {
  headline: string;
  subhead: string;
  attention: AttentionOrder[];
  customers: CustomerSummary[];
  /** Null when the model has nothing worth saying. Do not invent filler. */
  insight: { body: string; actionLabel: string } | null;
};
