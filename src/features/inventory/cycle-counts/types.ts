export type CycleCountPermissions = {
  canExecute: boolean;
  canPost: boolean;
  canRead: boolean;
  canReview: boolean;
};

export type CycleCountSheetSummary = {
  id: string;
  sheetNumber: number;
  status: 'draft' | 'available' | 'in_progress' | 'submitted' | 'recount_required' | 'approved' | 'posted';
  lineCount: number;
  completedLineCount: number;
  version: string;
};

export type CycleCountSession = {
  id: string;
  documentNumber: string;
  status: 'draft' | 'active' | 'in_review' | 'recount_required' | 'approved' | 'posted' | 'cancelled';
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  version: string;
  sheets: CycleCountSheetSummary[];
};

export type CycleCountWorkspace = {
  permissions: CycleCountPermissions;
  sessions: CycleCountSession[];
};

export type CycleCountLine = {
  id: string;
  lineNumber: number;
  productName: string;
  sku: string;
  uom: string;
  disposition: string;
  enteredQuantity: string | null;
  entryVersion: string;
  expectedQuantity: string | null;
  varianceQuantity: string | null;
};

export type CycleCountSheetWorkspace = {
  session: CycleCountSession;
  sheet: CycleCountSheetSummary;
  lines: CycleCountLine[];
};

export type CycleCountLease = {
  leaseExpiresAt: string;
  leaseFence: string;
  leaseToken: string;
  sheetVersion: string;
};

export type CycleCountEntry = {
  countLineId: string;
  enteredQuantity: string;
  expectedEntryVersion: string;
  idempotencyKey: string;
};
