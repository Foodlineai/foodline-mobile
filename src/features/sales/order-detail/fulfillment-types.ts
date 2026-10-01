/** View-model types for `get_current_sales_order_fulfillment`. */

export type SalesOrderLineFulfillment = {
  salesOrderLineId: string;
  orderedBaseQuantity: string;
  shippedBaseQuantity: string;
  reservedBaseQuantity: string;
  pickedUnshippedBaseQuantity: string;
  cancelledBaseQuantity: string;
  remainingBaseQuantity: string;
  backorderedBaseQuantity: string;
};

export type SalesOrderFulfillment = {
  salesOrderId: string;
  orderRowVersion: string;
  lines: SalesOrderLineFulfillment[];
};
