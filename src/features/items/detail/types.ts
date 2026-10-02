/** View-model types. These are what the screen renders — never a raw RPC payload. */

export type ItemLocation = {
  warehouseId: string;
  warehouseName: string;
  onHand: string;
  availableToPromise: string;
  reserved: string;
  /** null when on-order visibility isn't granted to this viewer. */
  onOrder: string | null;
  reorderStatus: string | null;
  soonestExpiry: string | null;
};

export type ItemLot = {
  id: string;
  lotCode: string;
  expiresOn: string | null;
  /** True when within 7 days of `expiresOn` — a display threshold, not a server field. */
  isShortDated: boolean;
  status: string;
  warehouseName: string;
  onHand: string;
  available: string;
};

export type ItemActivityEntry = {
  id: string;
  action: string;
  occurredAt: string;
};

export type ItemDetail = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  brandName: string | null;
  baseUomCode: string;
  trackLots: boolean;
  trackExpiry: boolean;
  catchWeight: boolean;
  /** false when `inventory.read` isn't granted — locations/lots are then always []. */
  canReadInventory: boolean;
  locations: ItemLocation[];
  /** Already FEFO-ordered by the RPC (soonest expiry first, nulls last). */
  lots: ItemLot[];
  /** Audit trail on this product, used as the "recent activity" section — not a movement ledger. */
  activity: ItemActivityEntry[];
  canManage: boolean;
  rowVersion: string;
};
