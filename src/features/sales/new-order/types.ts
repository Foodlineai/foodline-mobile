export type NewOrderCustomer = {
  id: string;
  code: string;
  name: string;
  defaultSiteId: string | null;
  defaultSiteLabel: string | null;
  routeLabel: string | null;
  eligible: boolean;
  blocker: string | null;
};

export type CatalogItem = {
  productId: string;
  productUomId: string;
  sku: string;
  name: string;
  uom: string;
  availableQuantity: string;
};

export type DraftLine = {
  productUomId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  extendedAmount: string;
  quoteKey: string;
};

export type NewOrderWorkspace = {
  organizationId: string;
  businessDate: string;
  minimumDeliveryDate: string;
  defaultDeliveryDate: string;
  currencyCode: string;
  canManageSalesOrders: boolean;
  defaultWarehouse: { id: string; code: string; label: string } | null;
  customers: NewOrderCustomer[];
  products: CatalogItem[];
};

export type NewSalesOrderDraft = {
  customerId: string;
  customerSiteId: string;
  lines: DraftLine[];
  requestedDeliveryDate: string;
  customerPo: string | null;
};

export type SalesOrderConfirmation = {
  id: string;
  documentNumber: string;
  currencyCode: string;
  total: string;
};
