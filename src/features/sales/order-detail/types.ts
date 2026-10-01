import type { Tone } from '../../../components/primitives';

/** View-model types. These are what the screen renders — never a raw RPC payload. */

export type SalesOrderLineDetail = {
  id: string;
  lineNumber: number | null;
  itemLabel: string;
  sku: string;
  uomCode: string;
  orderedQuantity: string;
  shippedBaseQuantity: string;
  unitPrice: string | null;
  totalAmount: string | null;
};

export type SalesOrderDetail = {
  id: string;
  documentNumber: string;
  customer: { id: string; name: string };
  orderStatus: { label: string; tone: Tone };
  shipmentStatus: string;
  invoiceStatus: string;
  orderDate: string | null;
  requestedDeliveryDate: string | null;
  total: string | null;
  lines: SalesOrderLineDetail[];
  rowVersion: string;
};
