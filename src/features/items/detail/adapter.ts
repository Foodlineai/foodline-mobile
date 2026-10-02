import type { ItemActivityEntry, ItemDetail, ItemLocation, ItemLot } from './types';

/**
 * Item detail adapter.
 *
 * `ITEM_DETAIL_RPC` confirmed 1 Oct against the live ERP source
 * (foodline-frontend, supabase/migrations/20260928120000_baseline.sql):
 * `get_current_product_workspace(p_product_id uuid) returns jsonb`. Every
 * key here is confirmed camelCase, built with explicit `jsonb_build_object`
 * calls throughout — no casing split to guard against.
 *
 * Requires `catalog.read`. `inventory`/`lots` additionally require
 * `inventory.read` — the RPC returns `null` for both rather than failing,
 * which `canReadInventory` on the view model reflects.
 *
 * `lots` arrives already FEFO-ordered (`expires_on nulls last`) straight from
 * the RPC — do not re-sort client-side.
 *
 * Not surfaced here, confirmed present but out of scope for a first pass:
 * `landedCost`, `pricing`, `sourcing`, `formOptions` — all editor/commercial
 * concerns, not a read screen's job. `auditEvents` stands in for "recent
 * activity"; there is no confirmed inventory-movement ledger RPC, so don't
 * call it "movement" in the UI — that would overclaim what this data is.
 */
export const ITEM_DETAIL_RPC: string | null = 'get_current_product_workspace';

type Raw = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;

const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

const SHORT_DATED_WINDOW_DAYS = 7;

function isShortDated(expiresOn: string | null): boolean {
  if (!expiresOn) return false;
  const days = (new Date(expiresOn).getTime() - Date.now()) / 86_400_000;
  return days <= SHORT_DATED_WINDOW_DAYS;
}

function mapLocation(row: Raw): ItemLocation {
  const warehouse = (row.warehouse ?? {}) as Raw;
  return {
    warehouseId: str(warehouse.id),
    warehouseName: str(warehouse.displayName, 'Unknown warehouse'),
    onHand: str(row.onHand, '0'),
    availableToPromise: str(row.availableToPromise, '0'),
    reserved: str(row.reserved, '0'),
    onOrder: row.onOrder == null ? null : str(row.onOrder),
    reorderStatus: str(row.reorderStatus) || null,
    soonestExpiry: str(row.soonestExpiry) || null,
  };
}

function mapLot(row: Raw): ItemLot {
  const expiresOn = str(row.expiresOn) || null;
  const warehouse = (row.warehouse ?? {}) as Raw;
  return {
    id: str(row.id, 'unknown'),
    lotCode: str(row.lotCode, 'Unlabeled lot'),
    expiresOn,
    isShortDated: isShortDated(expiresOn),
    status: str(row.status, 'active'),
    warehouseName: str(warehouse.displayName, 'Unknown warehouse'),
    onHand: str(row.onHand, '0'),
    available: str(row.available, '0'),
  };
}

function mapActivity(row: Raw, index: number): ItemActivityEntry {
  return {
    id: str(row.id, `activity-${index}`),
    action: str(row.action, 'updated'),
    occurredAt: str(row.occurredAt),
  };
}

export function toItemDetail(raw: Raw | null | undefined): ItemDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const product = (raw as Raw).product as Raw | undefined;
  if (!product) return null;

  const sku = str(product.sku);
  if (!sku) return null;

  const sources = (raw as Raw).sources as Raw | undefined;
  const inventorySource = sources?.inventory as Raw | undefined;
  const canReadInventory = str(inventorySource?.state) === 'available';

  const category = product.category as Raw | undefined;
  const brand = product.brand as Raw | undefined;
  const baseUom = product.baseUom as Raw | undefined;
  const capabilities = (raw as Raw).capabilities as Raw | undefined;

  return {
    id: str(product.id, 'unknown'),
    sku,
    name: str(product.displayName, sku),
    description: str(product.description) || null,
    categoryName: str(category?.displayName) || null,
    brandName: str(brand?.displayName) || null,
    baseUomCode: str(baseUom?.code, 'ea'),
    trackLots: Boolean(product.trackLots),
    trackExpiry: Boolean(product.trackExpiry),
    catchWeight: Boolean(product.catchWeight),
    canReadInventory,
    locations: arr((raw as Raw).inventory).map(mapLocation),
    lots: arr((raw as Raw).lots).map(mapLot),
    activity: arr((raw as Raw).auditEvents).map(mapActivity),
    canManage: Boolean(capabilities?.canManageProduct),
    rowVersion: str(product.rowVersion, '1'),
  };
}
