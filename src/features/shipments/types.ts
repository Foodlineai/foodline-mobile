export type ShipmentTarget = {
  orderId: string;
  reference: string;
  customerName: string;
  /** "11 lines · 26 cases · 2 pallets · Route A-12" */
  summary: string;
  /** Optimistic concurrency — send back unchanged on post. */
  rowVersion: string;
};

/**
 * Everything except `shipmentDate` is nullable, and the screen sends null rather
 * than an empty string. A distributor running its own trucks has no carrier and
 * no tracking number, and the backend must not treat "" as a supplied value.
 */
export type ShipmentDraft = {
  orderId: string;
  shipmentDate: string;
  carrier: string | null;
  trackingNumber: string | null;
  customerReference: string | null;
  internalNote: string | null;
  rowVersion: string;
};
