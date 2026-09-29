export type VendorOption = {
  id: string;
  name: string;
  /** "Net 30" */
  terms: string;
  leadTimeDays: number;
};

export type CatalogItem = {
  id: string;
  name: string;
  /** "6 × 5 lb" — never folded into the name. */
  packSize: string;
  /** "case", "lb" */
  uom: string;
  unitPrice: number;
};

export type DraftLine = {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type NewPoDraft = {
  vendorId: string;
  lines: DraftLine[];
  expectedDate: string;
  note: string | null;
};
