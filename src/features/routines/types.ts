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
   * Optimistic concurrency on the PO itself. Send back unchanged on approve;
   * if the server rejects, someone else touched this draft and the user must
   * re-read it.
   */
  rowVersion: string;
  /**
   * `decide_purchase_order_approval_command` approves an *approval cycle*,
   * not the PO directly — confirmed against the live RPC
   * (foodline-frontend's baseline.sql). Both below are required by that RPC
   * and have no other source; a draft that hasn't been submitted into a
   * cycle yet has no valid values here and can't be approved from this
   * screen.
   */
  approvalCycleId: string;
  approvalRequestRowVersion: string;
};
