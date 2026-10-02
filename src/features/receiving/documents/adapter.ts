import type {
  LineEdit,
  ParsedLine,
  PurchaseOrderLineOption,
  ReviewDetail,
  ReviewDraft,
  ReviewOrderContext,
  ReviewStatus,
  ReviewSummary,
  SavedCorrectionLine,
  SavedCorrections,
} from './types';

/**
 * Receiving-document review — confirmed 2 Oct against the live ERP source
 * (foodline-frontend, supabase/migrations/20260928120000_baseline.sql):
 *
 * - `list_governed_receiving_document_reviews()` → array of review records
 * - `get_governed_receiving_document_review(p_review_id)` → one record
 * - `save_governed_receiving_document_review(p_command_key, p_review_id,
 *   p_expected_row_version bigint, p_corrections)` → persists corrections,
 *   moves status to `in-review`. The parsed `envelope` is never overwritten,
 *   so the original parse stays visible next to any edit.
 * - `materialize_and_approve_governed_receiving_document_review(...)` →
 *   requires status `in-review` with corrections already saved; it
 *   materialises the **saved** corrections (arrival + goods receipt), not
 *   anything on the device. Nothing writes before this call.
 * - `reject_governed_receiving_document_review(..., p_reason)`
 *
 * This writes a goods receipt (received quantities, lots, expiry, weights,
 * temperature) against an approved, dispatched purchase order — a receiving
 * document, not a cost document. Confirmed absent from the envelope: no unit
 * cost, no price. Don't invent a cost total from it.
 *
 * Record keys are camelCase. Quantities are exact decimal strings, matched
 * server-side by `^(0|[1-9][0-9]{0,15})(\.[0-9]{1,4})?$` — keep them strings.
 *
 * Ambiguity not resolvable from the SQL: the parser's `uom.id` id space is
 * unspecified. Corrections need `productUomId`; this takes it from the
 * matched PO line (`get_purchase_order_workspace`), never from `uom.id`.
 */
export const REVIEW_LIST_RPC: string | null = 'list_governed_receiving_document_reviews';

type Raw = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;
const nstr = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : fallback;
const obj = (v: unknown): Raw => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {});
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

const STATUSES: ReviewStatus[] = ['pending-review', 'in-review', 'approved', 'rejected'];
const status = (v: unknown): ReviewStatus => (STATUSES.includes(v as ReviewStatus) ? (v as ReviewStatus) : 'pending-review');

export function toReviewSummary(raw: Raw): ReviewSummary | null {
  const reviewId = str(raw.reviewId);
  if (!reviewId) return null;
  const envelope = obj(raw.envelope);
  const parsed = obj(envelope.parsed);
  return {
    reviewId,
    status: status(raw.status),
    rowVersion: num(raw.rowVersion, 1),
    sender: str(envelope.sender),
    connector: str(envelope.connector),
    receivedAt: str(envelope.receivedAt),
    supplierDocumentNumber: nstr(parsed.supplierDocumentNumber),
    vendorLabel: nstr(obj(parsed.vendor).label),
    purchaseOrderLabel: nstr(obj(parsed.purchaseOrder).label),
    lineCount: arr(parsed.lines).length,
  };
}

function toParsedLine(l: Raw): ParsedLine {
  const c = obj(l.confidence);
  return {
    sourceLineId: str(l.sourceLineId),
    description: nstr(l.description),
    sku: nstr(l.sku),
    quantity: nstr(l.quantity),
    lotCode: nstr(l.lotCode),
    expiresOn: nstr(l.expiresOn),
    netWeight: nstr(l.netWeight),
    temperatureC: nstr(l.temperatureC),
    purchaseOrderVersionLineId: nstr(l.purchaseOrderVersionLineId),
    productId: nstr(obj(l.product).id),
    productLabel: nstr(obj(l.product).label),
    confidence: {
      item: num(c.item),
      lotAndExpiry: num(c.lotAndExpiry),
      quantity: num(c.quantity),
      uom: num(c.uom),
    },
  };
}

export function toSavedCorrections(raw: unknown): SavedCorrections | null {
  const c = obj(raw);
  if (!c.purchaseOrderId) return null;
  return {
    purchaseOrderId: str(c.purchaseOrderId),
    purchaseOrderVersionId: str(c.purchaseOrderVersionId),
    vendorId: str(c.vendorId),
    supplierDocumentNumber: str(c.supplierDocumentNumber),
    advanceShipNoticeId: nstr(c.advanceShipNoticeId),
    lines: arr(c.lines).map(
      (l): SavedCorrectionLine => ({
        correctionId: str(l.correctionId),
        sourceLineId: str(l.sourceLineId),
        purchaseOrderVersionLineId: nstr(l.purchaseOrderVersionLineId),
        productId: str(l.productId),
        productUomId: str(l.productUomId),
        acceptedQuantity: str(l.acceptedQuantity, '0'),
        damagedQuantity: str(l.damagedQuantity, '0'),
        rejectedQuantity: str(l.rejectedQuantity, '0'),
        lotCode: nstr(l.lotCode),
        expiresOn: nstr(l.expiresOn),
        netWeight: nstr(l.netWeight),
        temperatureC: nstr(l.temperatureC),
        notes: nstr(l.notes),
        reason: nstr(l.reason),
      })
    ),
  };
}

export function toReviewDetail(raw: Raw | null | undefined): ReviewDetail | null {
  if (!raw) return null;
  const reviewId = str(raw.reviewId);
  if (!reviewId) return null;
  const envelope = obj(raw.envelope);
  const parsed = obj(envelope.parsed);
  const vendor = obj(parsed.vendor);
  const po = obj(parsed.purchaseOrder);
  return {
    reviewId,
    status: status(raw.status),
    rowVersion: num(raw.rowVersion, 1),
    goodsReceiptId: nstr(raw.goodsReceiptId),
    rejectionReason: nstr(raw.rejectionReason),
    sender: str(envelope.sender),
    connector: str(envelope.connector),
    receivedAt: str(envelope.receivedAt),
    attachments: arr(envelope.attachments).map((a) => ({
      fileName: str(a.fileName),
      mediaType: str(a.mediaType),
      sizeBytes: num(a.sizeBytes),
    })),
    // The parser does not give a confidence for the document number itself.
    supplierDocumentNumber: { value: nstr(parsed.supplierDocumentNumber), confidence: null },
    vendor: { value: nstr(vendor.label), confidence: num(vendor.confidence), id: nstr(vendor.id) },
    purchaseOrder: { value: nstr(po.label), confidence: num(po.confidence), id: nstr(po.id) },
    lines: arr(parsed.lines).map(toParsedLine),
    saved: toSavedCorrections(raw.corrections),
  };
}

/**
 * Reads what corrections need from `get_purchase_order_workspace`'s payload
 * (top-level fields snake_case, `lines[]` camelCase — see the PO adapter).
 * Requires `purchasing.cost_read` server-side; without it the RPC raises and
 * the screen shows that error rather than a half-filled form.
 */
export function toReviewOrderContext(raw: Raw | null | undefined): ReviewOrderContext | null {
  const po = obj(obj(raw).purchase_order);
  const purchaseOrderId = str(po.purchase_order_id);
  const purchaseOrderVersionId = str(po.purchase_order_version_id);
  if (!purchaseOrderId || !purchaseOrderVersionId) return null;
  return {
    purchaseOrderId,
    purchaseOrderVersionId,
    vendorId: str(po.vendor_id),
    lines: arr(po.lines)
      .map(
        (l): PurchaseOrderLineOption => ({
          purchaseOrderVersionLineId: str(l.purchaseOrderVersionLineId),
          productId: str(l.productId),
          productUomId: str(l.productUomId),
          productName: str(l.productName, 'Unknown item'),
          sku: str(l.productSku),
          orderedQuantity: str(l.quantity, '0'),
        })
      )
      .filter((l) => l.purchaseOrderVersionLineId && l.productId && l.productUomId),
  };
}

/* ---------------------------------------------------------------- draft */

export const LOW_CONFIDENCE = 0.8;

export function lineConfidence(l: ParsedLine): number {
  const c = l.confidence;
  return Math.min(c.item, c.lotAndExpiry, c.quantity, c.uom);
}

/** Lowest-confidence lines first, so doubt is at the top rather than buried in document order. */
export function sortLinesByDoubt<T extends { sourceLineId: string }>(
  lines: T[],
  parsedById: Map<string, ParsedLine>
): T[] {
  const conf = (id: string) => {
    const p = parsedById.get(id);
    return p ? lineConfidence(p) : 1;
  };
  return [...lines].sort((a, b) => conf(a.sourceLineId) - conf(b.sourceLineId));
}

/** Starting point: what was saved last time if anything, else the parse as-is. */
export function initialDraft(detail: ReviewDetail): ReviewDraft {
  const savedBySource = new Map((detail.saved?.lines ?? []).map((l) => [l.sourceLineId, l]));
  const hasSaved = detail.saved !== null;
  return {
    supplierDocumentNumber: detail.saved?.supplierDocumentNumber ?? detail.supplierDocumentNumber.value ?? '',
    lines: detail.lines.map((p): LineEdit => {
      const s = savedBySource.get(p.sourceLineId);
      if (s) {
        return {
          sourceLineId: p.sourceLineId,
          include: true,
          purchaseOrderVersionLineId: s.purchaseOrderVersionLineId,
          acceptedQuantity: s.acceptedQuantity,
          damagedQuantity: s.damagedQuantity,
          rejectedQuantity: s.rejectedQuantity,
          lotCode: s.lotCode ?? '',
          expiresOn: s.expiresOn ?? '',
          netWeight: s.netWeight ?? '',
          temperatureC: s.temperatureC ?? '',
          reason: s.reason ?? '',
        };
      }
      return {
        sourceLineId: p.sourceLineId,
        // A saved set that omitted this line means the reviewer left it out.
        include: !hasSaved,
        purchaseOrderVersionLineId: p.purchaseOrderVersionLineId,
        acceptedQuantity: p.quantity ?? '0',
        damagedQuantity: '0',
        rejectedQuantity: '0',
        lotCode: p.lotCode ?? '',
        expiresOn: p.expiresOn ?? '',
        netWeight: p.netWeight ?? '',
        temperatureC: p.temperatureC ?? '',
        reason: '',
      };
    }),
  };
}

const QTY = /^(0|[1-9][0-9]{0,15})(\.[0-9]{1,4})?$/;
const TEMP = /^-?(0|[1-9][0-9]{0,15})(\.[0-9]{1,4})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type LineProblems = Partial<
  Record<'match' | 'accepted' | 'damaged' | 'rejected' | 'total' | 'reason' | 'weight' | 'temperature' | 'expiry' | 'lot', string>
>;

/** Mirrors the server's own rules so mistakes surface before a round trip; the server still decides. */
export function validateLine(e: LineEdit): LineProblems {
  if (!e.include) return {};
  const p: LineProblems = {};
  if (!e.purchaseOrderVersionLineId) p.match = 'Pick the order line this belongs to';
  if (!QTY.test(e.acceptedQuantity.trim())) p.accepted = 'Whole or up to 4 decimals';
  if (!QTY.test(e.damagedQuantity.trim())) p.damaged = 'Whole or up to 4 decimals';
  if (!QTY.test(e.rejectedQuantity.trim())) p.rejected = 'Whole or up to 4 decimals';
  if (!p.accepted && !p.damaged && !p.rejected) {
    const total = Number(e.acceptedQuantity) + Number(e.damagedQuantity) + Number(e.rejectedQuantity);
    if (total <= 0) p.total = 'At least one quantity must be above zero';
    if ((Number(e.damagedQuantity) > 0 || Number(e.rejectedQuantity) > 0) && e.reason.trim() === '') {
      p.reason = 'Say why it was damaged or rejected';
    }
  }
  if (e.reason.trim().length > 500) p.reason = 'Keep it under 500 characters';
  if (e.netWeight.trim() !== '' && !QTY.test(e.netWeight.trim())) p.weight = 'Number, up to 4 decimals';
  if (e.temperatureC.trim() !== '' && !TEMP.test(e.temperatureC.trim())) p.temperature = 'Number, up to 4 decimals';
  if (e.expiresOn.trim() !== '' && !DATE.test(e.expiresOn.trim())) p.expiry = 'Use YYYY-MM-DD';
  if (e.lotCode.trim().length > 120) p.lot = 'Under 120 characters';
  return p;
}

export function draftProblems(draft: ReviewDraft): string[] {
  const out: string[] = [];
  const included = draft.lines.filter((l) => l.include);
  if (draft.supplierDocumentNumber.trim() === '') out.push('Supplier document number is required');
  if (included.length === 0) out.push('Keep at least one line');
  if (draft.lines.some((l) => l.include && Object.keys(validateLine(l)).length > 0)) out.push('Fix the flagged lines');
  return out;
}

/** Live totals from the reviewer's edits — never from the parse. */
export function draftTotals(draft: ReviewDraft): { accepted: number; damaged: number; rejected: number; lines: number } {
  let accepted = 0;
  let damaged = 0;
  let rejected = 0;
  let lines = 0;
  for (const l of draft.lines) {
    if (!l.include) continue;
    lines += 1;
    accepted += Number(l.acceptedQuantity) || 0;
    damaged += Number(l.damagedQuantity) || 0;
    rejected += Number(l.rejectedQuantity) || 0;
  }
  return { accepted, damaged, rejected, lines };
}

/** True when the draft differs from what the server has saved (or nothing is saved yet). */
export function isDirty(draft: ReviewDraft, detail: ReviewDetail): boolean {
  if (detail.saved === null) return true;
  return JSON.stringify(draft) !== JSON.stringify(initialDraft(detail));
}

/**
 * Builds the exact `p_corrections` object the RPC's strict-key validator
 * accepts. Null for optional strings (never `''`); `evidenceAttachmentId`
 * is always null because only `unexpected-item` lines carry one and this
 * flow doesn't create those — they need an uploaded evidence record.
 */
export function buildCorrections(
  draft: ReviewDraft,
  detail: ReviewDetail,
  order: ReviewOrderContext,
  newId: () => string
): Raw {
  const existing = new Map((detail.saved?.lines ?? []).map((l) => [l.sourceLineId, l.correctionId]));
  const optional = (s: string) => (s.trim() === '' ? null : s.trim());
  const optionLines = new Map(order.lines.map((o) => [o.purchaseOrderVersionLineId, o]));
  return {
    advanceShipNoticeId: detail.saved?.advanceShipNoticeId ?? null,
    purchaseOrderId: order.purchaseOrderId,
    purchaseOrderVersionId: order.purchaseOrderVersionId,
    vendorId: order.vendorId,
    supplierDocumentNumber: draft.supplierDocumentNumber.trim(),
    lines: draft.lines
      .filter((l) => l.include)
      .map((l) => {
        const match = optionLines.get(l.purchaseOrderVersionLineId ?? '');
        if (!match) throw new Error('A kept line has no matching order line');
        return {
          correctionId: existing.get(l.sourceLineId) ?? newId(),
          sourceLineId: l.sourceLineId,
          lineType: 'purchase-order-line',
          purchaseOrderVersionLineId: match.purchaseOrderVersionLineId,
          productId: match.productId,
          productUomId: match.productUomId,
          acceptedQuantity: l.acceptedQuantity.trim(),
          damagedQuantity: l.damagedQuantity.trim(),
          rejectedQuantity: l.rejectedQuantity.trim(),
          lotCode: optional(l.lotCode),
          expiresOn: optional(l.expiresOn),
          netWeight: optional(l.netWeight),
          temperatureC: optional(l.temperatureC),
          notes: null,
          reason: optional(l.reason),
          evidenceAttachmentId: null,
        };
      }),
  };
}
