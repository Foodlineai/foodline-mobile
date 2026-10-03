import { z } from 'zod';

import type {
  CycleCountLease,
  CycleCountSession,
  CycleCountSheetWorkspace,
  CycleCountWorkspace,
} from './types';

const uuid = z.string().uuid();
const version = z.string().regex(/^[1-9]\d{0,18}$/);
const sequence = z.string().regex(/^(0|[1-9]\d{0,18})$/);
const decimal = z.string().regex(/^-?(0|[1-9]\d*)(?:\.\d+)?$/);

const sheetSchema = z.object({
  id: uuid,
  sheetNumber: z.number().int().positive(),
  status: z.enum(['draft', 'available', 'in_progress', 'submitted', 'recount_required', 'approved', 'posted']),
  lineCount: z.number().int().nonnegative(),
  completedLineCount: z.number().int().nonnegative(),
  version,
}).passthrough();

const sessionSchema = z.object({
  id: uuid,
  documentNumber: z.string().trim().min(1),
  status: z.enum(['draft', 'active', 'in_review', 'recount_required', 'approved', 'posted', 'cancelled']),
  warehouseId: uuid,
  warehouseName: z.string().trim().min(1),
  warehouseCode: z.string().trim().min(1),
  version,
  sheets: z.array(sheetSchema),
}).passthrough();

const workspaceSchema = z.object({
  organizationId: uuid,
  permissions: z.object({
    canExecute: z.boolean(),
    canPost: z.boolean(),
    canRead: z.boolean(),
    canReview: z.boolean(),
  }).strict(),
  sessions: z.array(sessionSchema).max(1000),
}).passthrough();

const lineSchema = z.object({
  id: uuid,
  lineNumber: z.number().int().positive(),
  productName: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  uom: z.string().trim().min(1),
  disposition: z.string().trim().min(1),
  enteredQuantity: decimal.nullable(),
  entryVersion: sequence,
  expectedQuantity: decimal.nullable(),
  varianceQuantity: decimal.nullable(),
}).passthrough();

const sheetWorkspaceSchema = z.object({
  organizationId: uuid,
  session: sessionSchema,
  sheet: sheetSchema,
  lines: z.array(lineSchema).max(100),
}).strict();

const leaseSchema = z.object({
  leaseExpiresAt: z.string().datetime({ offset: true }),
  leaseFence: sequence,
  leaseToken: uuid,
  sheetVersion: version,
}).strict();

const saveResultSchema = z.object({ saved: z.number().int().nonnegative() }).strict();
const submitResultSchema = z.object({ submitted: z.literal(true), version }).strict();

function confirmCompany(organizationId: string, companyId: string) {
  if (organizationId !== companyId) throw new Error('ERP returned cycle-count data for a different company.');
}

const mapSession = (session: z.infer<typeof sessionSchema>): CycleCountSession => ({
  id: session.id,
  documentNumber: session.documentNumber,
  status: session.status,
  warehouseId: session.warehouseId,
  warehouseName: session.warehouseName,
  warehouseCode: session.warehouseCode,
  version: session.version,
  sheets: session.sheets.map((sheet) => ({
    id: sheet.id,
    sheetNumber: sheet.sheetNumber,
    status: sheet.status,
    lineCount: sheet.lineCount,
    completedLineCount: sheet.completedLineCount,
    version: sheet.version,
  })),
});

export function toCycleCountWorkspace(payload: unknown, companyId: string): CycleCountWorkspace {
  const parsed = workspaceSchema.parse(payload);
  confirmCompany(parsed.organizationId, companyId);
  return { permissions: parsed.permissions, sessions: parsed.sessions.map(mapSession) };
}

export function toCycleCountSheetWorkspace(
  payload: unknown,
  companyId: string,
  sessionId: string,
  sheetId: string,
): CycleCountSheetWorkspace {
  const parsed = sheetWorkspaceSchema.parse(payload);
  confirmCompany(parsed.organizationId, companyId);
  if (parsed.session.id !== sessionId || parsed.sheet.id !== sheetId) {
    throw new Error('The cycle-count sheet identity could not be confirmed.');
  }
  return {
    session: mapSession(parsed.session),
    sheet: {
      id: parsed.sheet.id,
      sheetNumber: parsed.sheet.sheetNumber,
      status: parsed.sheet.status,
      lineCount: parsed.sheet.lineCount,
      completedLineCount: parsed.sheet.completedLineCount,
      version: parsed.sheet.version,
    },
    lines: parsed.lines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      productName: line.productName,
      sku: line.sku,
      uom: line.uom,
      disposition: line.disposition,
      enteredQuantity: line.enteredQuantity,
      entryVersion: line.entryVersion,
      expectedQuantity: line.expectedQuantity,
      varianceQuantity: line.varianceQuantity,
    })),
  };
}

export function toCycleCountLease(payload: unknown): CycleCountLease {
  return leaseSchema.parse(payload);
}

export function confirmSavedCycleCountEntries(payload: unknown, expected: number): void {
  const result = saveResultSchema.parse(payload);
  if (result.saved !== expected) throw new Error('The ERP did not confirm every cycle-count entry.');
}

export function confirmSubmittedCycleCount(payload: unknown): void {
  submitResultSchema.parse(payload);
}
