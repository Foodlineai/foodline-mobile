import type { SalesOrderDetail } from './types';

export const demoSalesOrderDetails: Record<string, SalesOrderDetail> = {
  so1: {
    id: 'so1',
    documentNumber: 'SO-1048',
    customer: { id: 'c1', name: 'Riverside Market' },
    orderStatus: { label: 'Short', tone: 'warn' },
    shipmentStatus: 'Partially shipped',
    invoiceStatus: 'Unbilled',
    orderDate: '2026-09-21',
    requestedDeliveryDate: '2026-09-23',
    total: '$1,840.25',
    lines: [
      { id: 'so1-l1', lineNumber: 1, itemLabel: 'Romaine Hearts, 24ct', sku: 'PRD-1042', uomCode: 'CS', orderedQuantity: '12', shippedBaseQuantity: '8', unitPrice: '$46.75', totalAmount: '$561.00' },
      { id: 'so1-l2', lineNumber: 2, itemLabel: 'Chicken Breast, Boneless 40lb', sku: 'PRO-0771', uomCode: 'CS', orderedQuantity: '10', shippedBaseQuantity: '10', unitPrice: '$127.92', totalAmount: '$1,279.25' },
    ],
    rowVersion: '2',
  },
  so2: {
    id: 'so2',
    documentNumber: 'SO-1042',
    customer: { id: 'c2', name: 'Cedar Grove' },
    orderStatus: { label: 'Out for delivery', tone: 'info' },
    shipmentStatus: 'Shipped',
    invoiceStatus: 'Invoiced',
    orderDate: '2026-09-20',
    requestedDeliveryDate: '2026-09-23',
    total: '$964.00',
    lines: [
      { id: 'so2-l1', lineNumber: 1, itemLabel: 'Whole Milk, 1gal', sku: 'DRY-0220', uomCode: 'CS', orderedQuantity: '24', shippedBaseQuantity: '24', unitPrice: '$40.17', totalAmount: '$964.00' },
    ],
    rowVersion: '3',
  },
  so3: {
    id: 'so3',
    documentNumber: 'SO-1039',
    customer: { id: 'c3', name: 'Hillside Deli' },
    orderStatus: { label: 'Delivered', tone: 'ok' },
    shipmentStatus: 'Shipped',
    invoiceStatus: 'Invoiced',
    orderDate: '2026-09-18',
    requestedDeliveryDate: '2026-09-22',
    total: '$412.80',
    lines: [
      { id: 'so3-l1', lineNumber: 1, itemLabel: 'Roma Tomatoes 25lb', sku: 'PRD-1188', uomCode: 'CS', orderedQuantity: '12', shippedBaseQuantity: '12', unitPrice: '$34.40', totalAmount: '$412.80' },
    ],
    rowVersion: '1',
  },
};
