export type CatalogItem = {
  id: string;
  name: string;
  /** "6 × 5 lb" — never folded into the name. */
  packSize: string;
  uom: string;
  unitPrice: number;
};

export type DraftLine = {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type NewSalesOrderDraft = {
  customerId: string;
  lines: DraftLine[];
  requestedDate: string;
  note: string | null;
};
