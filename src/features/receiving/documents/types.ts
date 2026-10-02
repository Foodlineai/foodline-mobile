/** View-model types for receiving-document review. Never a raw RPC payload. */

export type ReviewStatus = 'pending-review' | 'in-review' | 'approved' | 'rejected';

export type ReviewSummary = {
  reviewId: string;
  status: ReviewStatus;
  rowVersion: number;
  sender: string;
  connector: string;
  receivedAt: string;
  supplierDocumentNumber: string | null;
  vendorLabel: string | null;
  purchaseOrderLabel: string | null;
  lineCount: number;
};

/** A parsed value plus how sure the parser was (0–1). */
export type Parsed<T> = { value: T; confidence: number | null };

export type ParsedLine = {
  sourceLineId: string;
  description: string | null;
  sku: string | null;
  quantity: string | null;
  lotCode: string | null;
  expiresOn: string | null;
  netWeight: string | null;
  temperatureC: string | null;
  /** Parser's guess at the PO line; null when it couldn't match. */
  purchaseOrderVersionLineId: string | null;
  productId: string | null;
  productLabel: string | null;
  confidence: { item: number; lotAndExpiry: number; quantity: number; uom: number };
};

export type ReviewAttachment = { fileName: string; mediaType: string; sizeBytes: number };

/** What the reviewer has saved on the server so far (null until first save). */
export type SavedCorrectionLine = {
  correctionId: string;
  sourceLineId: string;
  purchaseOrderVersionLineId: string | null;
  productId: string;
  productUomId: string;
  acceptedQuantity: string;
  damagedQuantity: string;
  rejectedQuantity: string;
  lotCode: string | null;
  expiresOn: string | null;
  netWeight: string | null;
  temperatureC: string | null;
  notes: string | null;
  reason: string | null;
};

export type SavedCorrections = {
  purchaseOrderId: string;
  purchaseOrderVersionId: string;
  vendorId: string;
  supplierDocumentNumber: string;
  advanceShipNoticeId: string | null;
  lines: SavedCorrectionLine[];
};

export type ReviewDetail = {
  reviewId: string;
  status: ReviewStatus;
  rowVersion: number;
  goodsReceiptId: string | null;
  rejectionReason: string | null;
  sender: string;
  connector: string;
  receivedAt: string;
  attachments: ReviewAttachment[];
  supplierDocumentNumber: Parsed<string | null>;
  vendor: Parsed<string | null> & { id: string | null };
  purchaseOrder: Parsed<string | null> & { id: string | null };
  lines: ParsedLine[];
  saved: SavedCorrections | null;
};

/** An order line a parsed line can be matched to — from the PO workspace, not the parse. */
export type PurchaseOrderLineOption = {
  purchaseOrderVersionLineId: string;
  productId: string;
  productUomId: string;
  productName: string;
  sku: string;
  orderedQuantity: string;
};

/** Everything the reviewer needs about the order, fetched separately from the parse. */
export type ReviewOrderContext = {
  purchaseOrderId: string;
  purchaseOrderVersionId: string;
  vendorId: string;
  lines: PurchaseOrderLineOption[];
};

/** The reviewer's in-progress, per-line edits. Strings, because the RPC takes exact decimal strings. */
export type LineEdit = {
  sourceLineId: string;
  /** false → the line is left out of the receipt entirely. */
  include: boolean;
  purchaseOrderVersionLineId: string | null;
  acceptedQuantity: string;
  damagedQuantity: string;
  rejectedQuantity: string;
  lotCode: string;
  expiresOn: string;
  netWeight: string;
  temperatureC: string;
  reason: string;
};

export type ReviewDraft = {
  supplierDocumentNumber: string;
  lines: LineEdit[];
};
