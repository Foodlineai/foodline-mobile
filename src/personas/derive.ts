import type { CostVisibility, Persona, PersonaId } from './types';

/**
 * Maps the ERP's `roleKey` (from `application_session_context`, already
 * parsed onto `Company.roleKey` in src/lib/api/supabase-adapter.ts) onto the
 * five mobile personas.
 *
 * Confirmed 29 Sep against the live ERP source (foodline-frontend):
 * `roleKey` is one of twelve values — owner, admin, operations, finance, hr,
 * marketing, purchasing, sales, warehouse, driver, viewer, customer — set per
 * organization membership. The desktop app's own nav-gating does NOT use
 * `roleKey` at all; it gates on the separate `permissionKeys` array
 * (dotted strings like `sales.read`, `warehouse.pick`, `delivery.drive`).
 *
 * Five of the twelve `roleKey` values map cleanly onto a mobile persona.
 * The rest are a judgment call, not a confirmed mapping — flagged below.
 * This is presentation only (personas/types.ts's own header): a wrong guess
 * here shows someone a workspace list that doesn't quite fit, never data
 * they shouldn't have. The backend still enforces on every RPC regardless.
 */
export function personaIdForRoleKey(roleKey: string): PersonaId {
  switch (roleKey) {
    case 'owner':
    case 'admin':
      return 'admin';
    case 'sales':
      return 'sales';
    case 'purchasing':
      return 'purchasing';
    case 'warehouse':
      return 'inventory';
    case 'driver':
      return 'driver';
    // No mobile persona is designed for these — operations, finance, hr,
    // marketing, viewer, customer. Defaulting to 'admin' (broadest
    // visibility) rather than the most restrictive option: since this is a
    // visibility-only mapping and the server re-checks every RPC anyway,
    // under-showing a workspace to someone with real desktop access is a
    // worse day-to-day failure than over-showing one they can't act in
    // (which the RPC will simply decline). Revisit if any of these roles
    // turns out to actually carry mobile users.
    default:
      return 'admin';
  }
}

const LABEL: Record<PersonaId, string> = {
  admin: 'Admin',
  sales: 'Sales',
  purchasing: 'Purchasing',
  inventory: 'Inventory',
  driver: 'Driver',
};

/**
 * A sales representative quoting from landed cost is how margin walks out of
 * the building, so sales stays GP%-only. Cost visibility per role isn't exposed
 * by `application_session_context`, so this remains a presentation policy while
 * server permissions stay authoritative.
 */
const COST_VISIBILITY: Record<PersonaId, CostVisibility> = {
  admin: 'full',
  sales: 'gross-margin-only',
  purchasing: 'full',
  inventory: 'hidden',
  driver: 'hidden',
};

/**
 * Builds the persona shown in the header pill and the account screen from a
 * live `Company` (id/name/slug/roleKey/permissionKeys — see
 * `src/lib/api/types.ts`). `scopeLabel` has no confirmed source narrower
 * than the company itself (no warehouse/territory field comes back from
 * `application_session_context`), so it falls back to the company name
 * rather than fabricating a scope that isn't there.
 */
export function derivePersona(company: { roleKey: string; name: string }): Persona {
  const id = personaIdForRoleKey(company.roleKey);
  return {
    id,
    label: LABEL[id],
    scopeLabel: company.name,
    costVisibility: COST_VISIBILITY[id],
  };
}
