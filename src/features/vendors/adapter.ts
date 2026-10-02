import type { VendorDetail } from './types';

/**
 * Vendor detail adapter.
 *
 * `VENDOR_DETAIL_RPC` confirmed 1 Oct against the live ERP source
 * (foodline-frontend, supabase/migrations/20260928120000_baseline.sql):
 * `vendor_read(p_company_id uuid, p_vendor_id uuid) returns jsonb`, which is
 * `private.vendor_ui_record(...)` merged with a `purchaseOrders` key from
 * `private.vendor_purchase_order_exposure`. All keys here are confirmed
 * camelCase (built with explicit `jsonb_build_object`, not `to_jsonb` of a
 * row) — unlike the PO workspace RPC, there is no snake_case/camelCase split
 * to guard against.
 *
 * Requires `vendors.read`. Most of `profile` additionally requires nothing
 * extra, but `purchaseOrders` requires `purchasing.read` to appear at all
 * (null otherwise) and `purchasing.cost_read` for the amount breakdown.
 *
 * ⚠️ Confirmed absent, not assumed: no "open balance" / accounts-payable
 * figure on this RPC — only approval-cycle exposure (`purchaseOrders.amounts`,
 * which is the approved-version commitment, explicitly documented in the SQL
 * as *not* an inferred outstanding payable or receipt balance). Never show
 * one by computing it from anything else here.
 */
export const VENDOR_DETAIL_RPC: string | null = 'vendor_read';

type Raw = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

function money(value: unknown, currency: string): string {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (Number.isNaN(n)) return '—';
  try {
    return n.toLocaleString('en-US', { style: 'currency', currency });
  } catch {
    return `${n} ${currency}`;
  }
}

export function toVendorDetail(raw: Raw | null | undefined): VendorDetail | null {
  if (!raw || typeof raw !== 'object') return null;

  const name = str((raw as Raw).name);
  if (!name) return null;

  const profile = (raw as Raw).profile as Raw | null | undefined;
  const purchaseOrders = (raw as Raw).purchaseOrders as Raw | null | undefined;

  const amountsRaw = purchaseOrders && Array.isArray(purchaseOrders.amounts) ? (purchaseOrders.amounts as Raw[]) : [];

  return {
    id: str((raw as Raw).id, 'unknown'),
    name,
    code: str((raw as Raw).code),
    status: str((raw as Raw).status, 'unknown'),
    contact: {
      email: str(profile?.orderEmail) || null,
      phone: str(profile?.phone) || null,
    },
    paymentTermCode: str(profile?.paymentTermCode) || null,
    leadDays: num(profile?.leadDays),
    minimumOrderAmount: profile?.minimumOrderAmount ? money(profile.minimumOrderAmount, str(profile?.currencyCode, 'USD')) : null,
    hasOperatingProfile: profile != null,
    openOrderCount: num(purchaseOrders?.openCount) ?? 0,
    openAmounts: amountsRaw.map((a) => ({
      currency: str(a.currency, 'USD'),
      value: money(a.value, str(a.currency, 'USD')),
    })),
    canReadCost: Boolean(purchaseOrders?.canReadCost),
  };
}
