export type VendorOption = {
  id: string;
  name: string;
  currencyCode: string;
  buyerActorId: string | null;
};

export type WarehouseOption = {
  id: string;
  name: string;
  code: string;
};

export type CatalogItem = {
  /** ERP vendor-product id, used unchanged by preview and create. */
  id: string;
  vendorId: string;
  name: string;
  sku: string;
  /** "6 × 5 lb" — never folded into the name. */
  packSize: string;
  /** "case", "lb" */
  uom: string;
  unitPrice: string;
  minimumOrderQuantity: string;
  orderMultiple: string;
};

export type DraftLine = {
  itemId: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

export type NewPoDraft = {
  vendorId: string;
  warehouseId: string;
  buyerActorId: string | null;
  orderDate: string;
  lines: DraftLine[];
  expectedDate: string;
  note: string | null;
};

export type PurchaseOrderCreationWorkspace = {
  businessDate: string;
  canCreate: boolean;
  vendors: VendorOption[];
  warehouses: WarehouseOption[];
  catalog: CatalogItem[];
};

export type CreatedPurchaseOrder = {
  id: string;
  documentNumber: string;
  submissionStatus: 'submitted' | 'draft';
  submissionMessage: string | null;
};
