/**
 * Persona gating.
 *
 * ⚠️ READ THIS BEFORE CHANGING ANYTHING HERE.
 *
 * **This is presentation, not security.** The backend is persona-gated and every
 * RPC revalidates membership and permission — "selection is not authorization".
 * What this module does is stop showing a driver eleven workspaces they cannot
 * use. Hiding is a kindness, not a control.
 *
 * Two consequences follow, and both have been got wrong before:
 *
 *   1. Never treat a hidden workspace as a protected one. If an RPC would return
 *      data to a persona that should not have it, that is a backend bug and must
 *      be fixed there. Do not "fix" it by hiding the screen.
 *   2. Never invent permission logic on the device beyond this mapping. The
 *      server decides; the client arranges. Where the two disagree, the server
 *      is right and the mapping is stale.
 *
 * The front end has no user/role/permission model at all today (confirmed 31 Aug
 * and again 2 Sep). The agreed approach was to hide what a persona should not
 * see — two days of work, not a permission engine. This is that.
 */

export type PersonaId = 'admin' | 'sales' | 'purchasing' | 'inventory' | 'driver';

export type WorkspaceId =
  | 'sales'
  | 'purchasing'
  | 'inventory'
  | 'warehouse'
  | 'routes'
  | 'finance'
  | 'reports'
  | 'data'
  | 'settings';

/**
 * How a workspace appears for a persona.
 *
 *  - `full`    primary work — appears in My Work and the directory
 *  - `read`    visible and useful, but this persona does not act in it
 *  - `hidden`  not shown at all
 *
 * There is deliberately no `disabled` here. A workspace a persona has no
 * business in is noise, not information. Individual *actions* are disabled with
 * a reason (see contracts/actions.md) — whole workspaces are not.
 */
export type Access = 'full' | 'read' | 'hidden';

/**
 * What the persona may see of money.
 *
 * From the desktop roles model: Full, GP% only, Hidden. A rep seeing landed cost
 * is a commercial problem, not a UI one — get this wrong and margins walk out of
 * the building on a phone.
 */
export type CostVisibility = 'full' | 'gross-margin-only' | 'hidden';

export type Persona = {
  id: PersonaId;
  /** Shown in the header pill, e.g. "Inventory". */
  label: string;
  /** The scope half of the pill, e.g. "Atlanta warehouse". From the session. */
  scopeLabel: string;
  costVisibility: CostVisibility;
};

export type WorkspaceMeta = {
  id: WorkspaceId;
  label: string;
  group: 'operations' | 'business' | 'administration';
};

export const WORKSPACES: WorkspaceMeta[] = [
  { id: 'sales', label: 'Sales & Customers', group: 'operations' },
  { id: 'purchasing', label: 'Purchasing', group: 'operations' },
  { id: 'inventory', label: 'Inventory', group: 'operations' },
  { id: 'warehouse', label: 'Warehouse', group: 'operations' },
  { id: 'routes', label: 'Routes & Delivery', group: 'operations' },
  { id: 'finance', label: 'Finance', group: 'business' },
  { id: 'reports', label: 'Reports & Activity', group: 'business' },
  { id: 'data', label: 'Data & Integrations', group: 'business' },
  { id: 'settings', label: 'Company settings', group: 'administration' },
];

/**
 * The matrix. Least privilege by default — if a persona has no business in a
 * workspace, it is `hidden`, not `read`.
 *
 * The driver row is the one to look at when deciding whether a new workspace
 * belongs somewhere: a driver gets their route and nothing else. That is
 * deliberate, and it is the shape every other persona should be judged against.
 */
const MATRIX: Record<PersonaId, Record<WorkspaceId, Access>> = {
  admin: {
    sales: 'full', purchasing: 'full', inventory: 'full', warehouse: 'full',
    routes: 'full', finance: 'full', reports: 'full', data: 'full', settings: 'full',
  },
  sales: {
    sales: 'full',
    inventory: 'read',      // stock availability, to answer "can I promise this"
    routes: 'read',         // delivery progress, to answer "where is my order"
    reports: 'read',
    purchasing: 'hidden',
    warehouse: 'hidden',
    finance: 'hidden',      // a rep sees credit on the customer, not the ledger
    data: 'hidden',
    settings: 'hidden',
  },
  purchasing: {
    purchasing: 'full',
    inventory: 'read',
    warehouse: 'read',      // receiving is where their POs land
    finance: 'read',
    reports: 'read',
    sales: 'hidden',
    routes: 'hidden',
    data: 'hidden',
    settings: 'hidden',
  },
  inventory: {
    inventory: 'full',
    warehouse: 'full',
    sales: 'read',          // which orders are waiting on the stock they hold
    routes: 'read',
    purchasing: 'hidden',
    finance: 'hidden',
    reports: 'hidden',
    data: 'hidden',
    settings: 'hidden',
  },
  driver: {
    routes: 'full',
    sales: 'hidden', purchasing: 'hidden', inventory: 'hidden', warehouse: 'hidden',
    finance: 'hidden', reports: 'hidden', data: 'hidden', settings: 'hidden',
  },
};

export function accessFor(persona: PersonaId, workspace: WorkspaceId): Access {
  return MATRIX[persona]?.[workspace] ?? 'hidden';
}

/** Workspaces this persona acts in. Drives My Work and the home screen. */
export function primaryWorkspaces(persona: PersonaId): WorkspaceMeta[] {
  return WORKSPACES.filter((w) => accessFor(persona, w.id) === 'full');
}

/** Everything visible, in nav order, for the workspace directory. */
export function visibleWorkspaces(
  persona: PersonaId,
): { workspace: WorkspaceMeta; access: Exclude<Access, 'hidden'> }[] {
  const out: { workspace: WorkspaceMeta; access: Exclude<Access, 'hidden'> }[] = [];
  for (const w of WORKSPACES) {
    const a = accessFor(persona, w.id);
    if (a !== 'hidden') out.push({ workspace: w, access: a });
  }
  return out;
}

/**
 * True when a persona sees only one workspace.
 *
 * A driver with one workspace should not be shown a directory of one item — the
 * app opens straight into their route. Checking this rather than hardcoding
 * `persona === 'driver'` means the behaviour stays right if the matrix changes.
 */
export function hasSingleWorkspace(persona: PersonaId): boolean {
  return primaryWorkspaces(persona).length === 1;
}

/** Whether a money figure may be rendered at all for this persona. */
export function canSeeCost(persona: Persona, kind: 'cost' | 'margin' | 'price'): boolean {
  if (kind === 'price') return true; // what the customer pays is not sensitive internally
  if (persona.costVisibility === 'full') return true;
  if (persona.costVisibility === 'gross-margin-only') return kind === 'margin';
  return false;
}
