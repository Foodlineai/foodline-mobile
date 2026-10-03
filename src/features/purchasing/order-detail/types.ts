import type { Tone } from '../../../components/primitives';

/** View-model types. These are what the screen renders — never a raw RPC payload. */

export type PurchaseOrderLineDetail = {
  id: string;
  lineNumber: number | null;
  productName: string;
  productSku: string;
  uomCode: string;
  quantity: string;
  /** null when the viewer lacks `purchasing.cost_read` — never shown as 0. */
  unitCost: string | null;
  totalAmount: string | null;
};

export type PurchaseOrderDetail = {
  id: string;
  documentNumber: string;
  status: { label: string; tone: Tone };
  vendor: { id: string | null; name: string };
  warehouseName: string | null;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  notes: string | null;
  /** null when cost is hidden from this viewer, not when it is zero. */
  total: string | null;
  lineCount: number;
  lines: PurchaseOrderLineDetail[];
  canReadCost: boolean;
  rowVersion: string;
};
