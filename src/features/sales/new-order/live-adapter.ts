import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';
import type {
  CatalogItem,
  DraftLine,
  NewOrderWorkspace,
  NewSalesOrderDraft,
  SalesOrderConfirmation,
} from './types';

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.string().regex(/^(?:0|[1-9]\d{0,17})(?:\.\d{1,4})?$/);
const quantity = z.string().regex(/^[1-9]\d*$/);
const quoteKey = z.string().regex(/^[0-9a-f]{64}$/);

const workspaceSchema = z
  .object({
    organizationId: uuid,
    businessDate: date,
    minimumDeliveryDate: date,
    defaultDeliveryDate: date,
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    capabilities: z.object({ canManageSalesOrders: z.boolean() }),
    defaultWarehouse: z.object({ id: uuid, code: z.string().min(1), label: z.string().min(1) }).nullable(),
    customers: z.array(
      z.object({
        id: uuid,
        code: z.string().min(1),
        name: z.string().min(1),
        defaultSiteId: uuid.nullable(),
        defaultSiteLabel: z.string().min(1).nullable(),
        routeLabel: z.string().min(1).nullable(),
        eligible: z.boolean(),
        blocker: z.string().nullable(),
      })
    ),
    products: z.array(
      z.object({
        productId: uuid,
        productUomId: uuid,
        sku: z.string().min(1),
        label: z.string().min(1),
        uom: z.string().min(1),
        availableQuantity: z.string(),
      })
    ),
  })
  .strict();

const lineQuoteSchema = z
  .object({
    organizationId: uuid,
    quoteKey,
    customerId: uuid,
    customerSiteId: uuid,
    productId: uuid,
    productUomId: uuid,
    quantity,
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    priceSource: z.literal('price-list').nullable(),
    unitPrice: money.nullable(),
    extendedAmount: money.nullable(),
    availableQuantity: z.string(),
    eligible: z.boolean(),
    blockers: z.array(z.string()),
  })
  .strict();

const confirmationSchema = z
  .object({
    organizationId: uuid,
    commandKey: uuid,
    salesOrderId: uuid,
    documentNumber: z.string().min(1),
    rowVersion: z.string().regex(/^[1-9]\d*$/),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    subtotal: money,
    taxTotal: money,
    total: money,
    status: z.literal('confirmed'),
    lines: z.array(
      z.object({
        salesOrderLineId: uuid,
        productId: uuid,
        productUomId: uuid,
        quantity: z.string(),
        reservationIds: z.array(uuid).min(1),
      })
    ),
    replayed: z.boolean(),
  })
  .strict();

type Rpc = (
  name: string,
  args?: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

const safeErrors: Record<string, string> = {
  sales_order_forbidden: 'You do not have permission to create sales orders.',
  sales_manage_required: 'You do not have permission to create sales orders.',
  inventory_reservation_required: 'You do not have permission to reserve inventory for this order.',
  sales_order_customer_ineligible: 'This customer is not eligible to order.',
  sales_order_site_required: 'This customer needs an eligible delivery site.',
  sales_order_warehouse_not_configured: 'A default sales warehouse is not configured.',
  sales_order_price_changed: 'A price changed. Review the updated line and try again.',
  sales_order_price_not_found: 'No current price is available for this item.',
  sales_order_insufficient_stock: 'There is not enough available stock for this quantity.',
  sales_order_idempotency_conflict: 'This submission was already used for a different order.',
  sales_order_version_conflict: 'The order data changed. Refresh and try again.',
};

function failure(message: string) {
  return new Error(safeErrors[message] ?? 'Foodline could not complete the sales order request.');
}

async function rpc(companyId: string, name: string, args?: Record<string, unknown>) {
  const client = getSupabase(companyId);
  const { data, error } = await (client.rpc as unknown as Rpc)(name, args);
  if (error) throw failure(error.message);
  return data;
}

export async function loadNewOrderWorkspace(companyId: string): Promise<NewOrderWorkspace> {
  const parsed = workspaceSchema.safeParse(await rpc(companyId, 'get_current_new_order_workspace'));
  if (!parsed.success || parsed.data.organizationId !== companyId) {
    throw new Error('Foodline returned an invalid sales order workspace.');
  }
  return {
    organizationId: parsed.data.organizationId,
    businessDate: parsed.data.businessDate,
    minimumDeliveryDate: parsed.data.minimumDeliveryDate,
    defaultDeliveryDate: parsed.data.defaultDeliveryDate,
    currencyCode: parsed.data.currencyCode,
    canManageSalesOrders: parsed.data.capabilities.canManageSalesOrders,
    defaultWarehouse: parsed.data.defaultWarehouse,
    customers: parsed.data.customers,
    products: parsed.data.products.map((product): CatalogItem => ({
      productId: product.productId,
      productUomId: product.productUomId,
      sku: product.sku,
      name: product.label,
      uom: product.uom,
      availableQuantity: product.availableQuantity,
    })),
  };
}

export async function quoteNewOrderLine(
  companyId: string,
  input: { customerId: string; customerSiteId: string; item: CatalogItem; quantity: number }
): Promise<DraftLine> {
  const quantityText = String(input.quantity);
  const parsed = lineQuoteSchema.safeParse(
    await rpc(companyId, 'quote_current_new_order_line', {
      p_customer_id: input.customerId,
      p_customer_site_id: input.customerSiteId,
      p_product_uom_id: input.item.productUomId,
      p_quantity: quantityText,
    })
  );
  if (
    !parsed.success ||
    parsed.data.organizationId !== companyId ||
    parsed.data.customerId !== input.customerId ||
    parsed.data.customerSiteId !== input.customerSiteId ||
    parsed.data.productUomId !== input.item.productUomId ||
    parsed.data.quantity !== quantityText
  ) {
    throw new Error('Foodline returned an invalid price quote.');
  }
  if (!parsed.data.eligible || !parsed.data.unitPrice || !parsed.data.extendedAmount) {
    throw failure(parsed.data.blockers[0] ?? 'sales_order_price_not_found');
  }
  return {
    productUomId: input.item.productUomId,
    description: `${input.item.name} · ${input.item.uom}`,
    quantity: input.quantity,
    unitPrice: parsed.data.unitPrice,
    extendedAmount: parsed.data.extendedAmount,
    quoteKey: parsed.data.quoteKey,
  };
}

export async function confirmNewSalesOrder(
  companyId: string,
  draft: NewSalesOrderDraft,
  commandKey: string
): Promise<SalesOrderConfirmation> {
  const parsed = confirmationSchema.safeParse(
    await rpc(companyId, 'confirm_current_sales_order', {
      p_command_key: commandKey,
      p_payload: {
        customerId: draft.customerId,
        customerSiteId: draft.customerSiteId,
        requestedDeliveryDate: draft.requestedDeliveryDate,
        customerPo: draft.customerPo,
        lines: draft.lines.map((line) => ({
          productUomId: line.productUomId,
          quantity: String(line.quantity),
          quoteKey: line.quoteKey,
        })),
      },
    })
  );
  if (
    !parsed.success ||
    parsed.data.organizationId !== companyId ||
    parsed.data.commandKey !== commandKey ||
    parsed.data.lines.length !== draft.lines.length ||
    !draft.lines.every((line, index) => parsed.data.lines[index]?.productUomId === line.productUomId)
  ) {
    throw new Error('Foodline returned an invalid order confirmation.');
  }
  return {
    id: parsed.data.salesOrderId,
    documentNumber: parsed.data.documentNumber,
    currencyCode: parsed.data.currencyCode,
    total: parsed.data.total,
  };
}
