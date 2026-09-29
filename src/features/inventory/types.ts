export type UnitOfMeasure = 'case' | 'catch-weight';

export type StockItem = {
  id: string;
  name: string;
  /** "6 × 5 lb", "avg 12 lb", "12 × 820 g". Never folded into the name. */
  packSize: string;
  uom: UnitOfMeasure;
  /** Bin or zone, when the item is in one place. */
  location?: string;
  onHand: number;
  /** Right-hand sub-line: "18 available", "108.4 lb", "Below par". */
  availableLabel: string;
  /** Drives the row tint. Only one can apply; order of precedence is
   *  belowPar → expiring → none, decided in the adapter, not the view. */
  flag?: 'below-par' | 'expiring';
  /** Shown as a tag when expiring. */
  expiryLabel?: string;
};

export type ItemsFilter = {
  id: string;
  label: string;
};
