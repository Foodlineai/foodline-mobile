import type { ReviewDetail, ReviewOrderContext } from './types';

/**
 * Demo data — our own template delivery document, not a customer's. That is
 * deliberate and should be said out loud in any demo: the parser has
 * effectively seen this layout before, so a clean result here is not
 * evidence it will read an arbitrary supplier's paperwork. The capability is
 * real; accuracy is tuned per customer during implementation.
 *
 * Built to exercise the review: one clean line, one with a low-confidence
 * quantity (parsed 40 against 24 ordered), one the parser couldn't match.
 */
export const demoOrderContext: ReviewOrderContext = {
  purchaseOrderId: 'po2',
  purchaseOrderVersionId: 'po2-v3',
  vendorId: 'v2',
  lines: [
    { purchaseOrderVersionLineId: 'po2-l1', productId: 'i3', productUomId: 'i3-cs', productName: 'Chicken Breast, Boneless 40lb', sku: 'PRO-0771', orderedQuantity: '24' },
    { purchaseOrderVersionLineId: 'po2-l2', productId: 'i4', productUomId: 'i4-cs', productName: 'Heavy Cream 12/qt', sku: 'DAI-0310', orderedQuantity: '12' },
    { purchaseOrderVersionLineId: 'po2-l3', productId: 'i5', productUomId: 'i5-cs', productName: 'Shoestring Fries 6/5lb', sku: 'FRZ-5580', orderedQuantity: '10' },
  ],
};

export function makeDemoReview(): ReviewDetail {
  return {
    reviewId: 'rev1',
    status: 'pending-review',
    rowVersion: 1,
    goodsReceiptId: null,
    rejectionReason: null,
    sender: 'dispatch@southernpoultry.example',
    connector: 'manual-upload',
    receivedAt: '2026-10-02T07:48:00Z',
    attachments: [{ fileName: 'SPC-packing-slip-4468.pdf', mediaType: 'application/pdf', sizeBytes: 184_320 }],
    supplierDocumentNumber: { value: 'PS-77120', confidence: null },
    vendor: { value: 'Southern Poultry Co', confidence: 0.97, id: 'v2' },
    purchaseOrder: { value: 'PO-4468', confidence: 0.94, id: 'po2' },
    lines: [
      {
        sourceLineId: 'row-1',
        description: 'Chicken breast boneless 40#',
        sku: 'PRO-0771',
        quantity: '24',
        lotCode: 'L-1002A',
        expiresOn: '2026-10-19',
        netWeight: '960',
        temperatureC: '2.5',
        purchaseOrderVersionLineId: 'po2-l1',
        productId: 'i3',
        productLabel: 'PRO-0771 · Chicken Breast, Boneless 40lb',
        confidence: { item: 0.98, lotAndExpiry: 0.93, quantity: 0.96, uom: 0.95 },
      },
      {
        sourceLineId: 'row-2',
        description: 'Heavy cream qt x12',
        sku: 'DAI-0310',
        quantity: '40',
        lotCode: null,
        expiresOn: null,
        netWeight: null,
        temperatureC: null,
        purchaseOrderVersionLineId: 'po2-l2',
        productId: 'i4',
        productLabel: 'DAI-0310 · Heavy Cream 12/qt',
        // Parsed 40 against 12 ordered, and the scan was smudged.
        confidence: { item: 0.91, lotAndExpiry: 0.4, quantity: 0.52, uom: 0.88 },
      },
      {
        sourceLineId: 'row-3',
        description: 'Fries shoestring 6x5',
        sku: null,
        quantity: '10',
        lotCode: null,
        expiresOn: null,
        netWeight: null,
        temperatureC: null,
        purchaseOrderVersionLineId: null,
        productId: null,
        productLabel: null,
        confidence: { item: 0.35, lotAndExpiry: 0.9, quantity: 0.9, uom: 0.7 },
      },
    ],
    saved: null,
  };
}
