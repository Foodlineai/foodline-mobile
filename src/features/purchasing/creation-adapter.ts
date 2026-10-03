import { z } from 'zod';

import type { CatalogItem, CreatedPurchaseOrder, NewPoDraft, PurchaseOrderCreationWorkspace } from './types';

const uuid = z.string().uuid();
const exactDecimal = z.string().regex(/^\d{1,16}(?:\.\d{1,4})?$/);
const positiveDecimal = exactDecimal.refine((value) => decimalToScaled(value) > 0n);
const isoDate = z.string().date();

const editorSchema = z.object({
  companyId: uuid,
  businessDate: isoDate,
  canCreate: z.boolean(),
  selectedCurrencyCode: z.literal('USD').nullable(),
  vendors: z.array(
    z.object({
      id: uuid,
      name: z.string().trim().min(1),
      currencyCode: z.literal('USD').nullable(),
      buyerActorId: uuid.nullable(),
    })
  ),
  warehouses: z.array(z.object({ id: uuid, code: z.string().trim().min(1), name: z.string().trim().min(1) })),
  items: z.array(
    z.object({
      vendorId: uuid,
      vendorProductId: uuid,
      sku: z.string().trim().min(1),
      productName: z.string().trim().min(1),
      purchaseUom: z.string().trim().min(1),
      baseUom: z.string().trim().min(1),
      conversionToBase: positiveDecimal,
      minimumOrderQuantity: positiveDecimal,
      orderMultiple: positiveDecimal,
      eligible: z.boolean(),
      quote: z.object({ currencyCode: z.literal('USD'), unitCost: exactDecimal }).nullable(),
    })
  ),
});

const previewSchema = z.object({
  organizationId: uuid,
  vendorId: uuid,
  warehouseId: uuid,
  orderDate: isoDate,
  expectedDeliveryDate: isoDate.nullable(),
  quoteHash: z.string().regex(/^[a-f0-9]{64}$/),
  canCreate: z.boolean(),
  totalAmount: exactDecimal,
  pricedLines: z.array(
    z.object({ vendorProductId: uuid, quantity: positiveDecimal, unitCost: exactDecimal })
  ),
});

const savedSchema = z.object({
  purchaseOrderId: uuid,
  purchaseOrderVersionId: uuid,
  documentNumber: z.string().trim().min(1),
  rowVersion: z.string().regex(/^[1-9]\d*$/),
  quoteHash: z.string().regex(/^[a-f0-9]{64}$/),
});

const submissionSchema = z.object({
  approval_status: z.enum(['pending', 'approved', 'rejected', 'changes_requested']),
  purchase_order_id: uuid,
  purchase_order_version_id: uuid,
});

const draftSchema = z
  .object({
    vendorId: uuid,
    warehouseId: uuid,
    buyerActorId: uuid.nullable(),
    orderDate: isoDate,
    expectedDate: isoDate,
    note: z.string().trim().max(2000).nullable(),
    lines: z
      .array(
        z.object({
          itemId: uuid,
          description: z.string(),
          quantity: positiveDecimal,
          unitPrice: exactDecimal,
        })
      )
      .min(1)
      .max(100),
  })
  .superRefine((draft, context) => {
    if (draft.expectedDate < draft.orderDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expectedDate'],
        message: 'Expected delivery cannot be before the order date.',
      });
    }
    if (new Set(draft.lines.map((line) => line.itemId)).size !== draft.lines.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lines'],
        message: 'Each vendor item can appear only once.',
      });
    }
  });

export type PurchaseOrderRpcInput = {
  vendorId: string;
  warehouseId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  buyerActorId: string | null;
  lines: {
    lineId: null;
    vendorProductId: string;
    quantity: string;
    notes: null;
    sourceGuideLineId: null;
  }[];
  charges: { freight: string; fuelSurcharge: string; duties: string; brokerage: string };
  allocationMethod: 'value';
  source: null;
};

export function toPurchaseOrderCreationWorkspace(
  payload: unknown,
  expectedCompanyId: string
): PurchaseOrderCreationWorkspace {
  const parsed = editorSchema.parse(payload);
  if (parsed.companyId !== expectedCompanyId)
    throw new Error('The purchase-order workspace returned an unexpected company.');

  const vendorIds = new Set(parsed.vendors.map((vendor) => vendor.id));
  return {
    businessDate: parsed.businessDate,
    canCreate: parsed.canCreate,
    vendors: parsed.vendors
      .filter((vendor) => vendor.currencyCode === 'USD')
      .map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        currencyCode: 'USD',
        buyerActorId: vendor.buyerActorId,
      })),
    warehouses: parsed.warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
    })),
    catalog: parsed.items.flatMap((item): CatalogItem[] => {
      if (!vendorIds.has(item.vendorId) || !item.eligible || !item.quote) return [];
      return [
        {
          id: item.vendorProductId,
          vendorId: item.vendorId,
          name: item.productName,
          sku: item.sku,
          packSize: `${item.conversionToBase} ${item.baseUom}`,
          uom: item.purchaseUom,
          unitPrice: item.quote.unitCost,
          minimumOrderQuantity: item.minimumOrderQuantity,
          orderMultiple: item.orderMultiple,
        },
      ];
    }),
  };
}

export function toPurchaseOrderRpcInput(draft: NewPoDraft): PurchaseOrderRpcInput {
  const parsed = draftSchema.parse(draft);
  return {
    vendorId: parsed.vendorId,
    warehouseId: parsed.warehouseId,
    orderDate: parsed.orderDate,
    expectedDeliveryDate: parsed.expectedDate,
    buyerActorId: parsed.buyerActorId,
    lines: parsed.lines.map((line) => ({
      lineId: null,
      vendorProductId: line.itemId,
      quantity: canonicalDecimal(line.quantity),
      notes: null,
      sourceGuideLineId: null,
    })),
    charges: { freight: '0', fuelSurcharge: '0', duties: '0', brokerage: '0' },
    allocationMethod: 'value',
    source: null,
  };
}

export function confirmPurchaseOrderPreview(
  payload: unknown,
  companyId: string,
  input: PurchaseOrderRpcInput
) {
  const preview = previewSchema.parse(payload);
  if (
    preview.organizationId !== companyId ||
    preview.vendorId !== input.vendorId ||
    preview.warehouseId !== input.warehouseId ||
    preview.orderDate !== input.orderDate ||
    preview.expectedDeliveryDate !== input.expectedDeliveryDate
  ) {
    throw new Error('The purchase-order quote did not match the reviewed draft.');
  }
  const expectedLines = new Map(
    input.lines.map((line) => [line.vendorProductId, canonicalDecimal(line.quantity)])
  );
  if (
    preview.pricedLines.length !== expectedLines.size ||
    preview.pricedLines.some(
      (line) => expectedLines.get(line.vendorProductId) !== canonicalDecimal(line.quantity)
    )
  ) {
    throw new Error('The purchase-order quote lines did not match the reviewed draft.');
  }
  if (!preview.canCreate) throw new Error('Your account does not have permission to create purchase orders.');
  return preview;
}

export function confirmSavedPurchaseOrder(payload: unknown, quoteHash: string) {
  const saved = savedSchema.parse(payload);
  if (saved.quoteHash !== quoteHash)
    throw new Error('The saved purchase order did not match the reviewed quote.');
  return saved;
}

export function confirmSubmittedPurchaseOrder(
  payload: unknown,
  saved: z.infer<typeof savedSchema>
): CreatedPurchaseOrder {
  const submission = submissionSchema.parse(payload);
  if (
    submission.purchase_order_id !== saved.purchaseOrderId ||
    submission.purchase_order_version_id !== saved.purchaseOrderVersionId
  ) {
    throw new Error('The submission response did not match the created purchase order.');
  }
  return {
    id: saved.purchaseOrderId,
    documentNumber: saved.documentNumber,
    submissionStatus: 'submitted',
    submissionMessage:
      submission.approval_status === 'pending'
        ? 'Submitted for approval.'
        : submission.approval_status === 'approved'
          ? 'Approved and ready for dispatch.'
          : `Submission status: ${submission.approval_status.replace('_', ' ')}.`,
  };
}

export function draftOnlyResult(saved: z.infer<typeof savedSchema>, reason: string): CreatedPurchaseOrder {
  return {
    id: saved.purchaseOrderId,
    documentNumber: saved.documentNumber,
    submissionStatus: 'draft',
    submissionMessage: reason,
  };
}

export function purchaseOrderCreationError(error: unknown): Error {
  const message = error instanceof Error ? error.message : '';
  const known: [RegExp, string][] = [
    [
      /purchasing_manage_required|access_denied/i,
      'Your account does not have permission to create purchase orders.',
    ],
    [
      /purchasing_cost_read_required/i,
      'Your account cannot view the vendor costs required to create an order.',
    ],
    [
      /active_vendor_profile_required|active_vendor_ordering_site_required|active_payment_term_required/i,
      'This vendor is missing required purchasing setup in the ERP.',
    ],
    [
      /active_vendor_required|vendor_not_found/i,
      'This vendor is no longer available. Refresh and choose another vendor.',
    ],
    [
      /active_warehouse_required/i,
      'This warehouse is no longer available. Refresh and choose another warehouse.',
    ],
    [
      /effective_vendor_cost_required|purchase_order_vendor_product_not_orderable/i,
      'A selected item no longer has an orderable live vendor cost. Refresh the catalog.',
    ],
    [
      /purchase_order_quantity_not_orderable/i,
      'A quantity no longer meets the vendor minimum or order increment.',
    ],
    [
      /purchasing_quote_stale|purchase_quote_changed/i,
      'The vendor quote changed. Review the refreshed order before submitting.',
    ],
    [
      /purchasing_command_idempotency_conflict|command_key_conflict/i,
      'This submission key was already used for a different order.',
    ],
  ];
  return new Error(
    known.find(([pattern]) => pattern.test(message))?.[1] ??
      'The ERP could not confirm the purchase order. Your draft remains on this screen.'
  );
}

export function firstOrderableQuantity(item: CatalogItem): string {
  const minimum = decimalToScaled(item.minimumOrderQuantity);
  const multiple = decimalToScaled(item.orderMultiple);
  return scaledToDecimal(((minimum + multiple - 1n) / multiple) * multiple);
}

export function adjustOrderQuantity(
  quantity: string,
  multiple: string,
  direction: 1 | -1,
  minimum = '0'
): string | null {
  const next = decimalToScaled(quantity) + BigInt(direction) * decimalToScaled(multiple);
  const smallest = decimalToScaled(minimum);
  return next >= smallest && next > 0n ? scaledToDecimal(next) : null;
}

export function exactLineTotal(unitPrice: string, quantity: string): string {
  const product = decimalToScaled(unitPrice) * decimalToScaled(quantity);
  const cents = (product + 500_000n) / 1_000_000n;
  return `$${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

export function exactOrderTotal(lines: { unitPrice: string; quantity: string }[]): string {
  const cents = lines.reduce((sum, line) => {
    const product = decimalToScaled(line.unitPrice) * decimalToScaled(line.quantity);
    return sum + (product + 500_000n) / 1_000_000n;
  }, 0n);
  return `$${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

function canonicalDecimal(value: string): string {
  return scaledToDecimal(decimalToScaled(value));
}

function decimalToScaled(value: string): bigint {
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole) * 10_000n + BigInt((fraction + '0000').slice(0, 4));
}

function scaledToDecimal(value: bigint): string {
  const whole = value / 10_000n;
  const fraction = String(value % 10_000n)
    .padStart(4, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}
