export type DraftLine = {
  id: string;
  description: string;
  /** "18 cases" — formatted server-side or in the adapter, never in the view. */
  quantityLabel: string;
};

export type DraftedPurchaseOrder = {
  id: string;
  reference: string;
  vendorName: string;
  formattedTotal: string;
  summary: string;
  lines: DraftLine[];
  /** Lines beyond the first few, shown as "and N more". */
  lineOverflow: number;
  /**
   * Optimistic concurrency. Send back unchanged on approve; if the server
   * rejects, someone else touched this draft and the user must re-read it.
   */
  rowVersion: string;
};
