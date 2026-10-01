import type { Persona } from './types';

/**
 * Demo personas. Switching between these in demo mode is the fastest way to show
 * a customer what persona gating means — the same app, five shapes.
 */
export const demoPersonas: Record<string, Persona> = {
  admin: {
    id: 'admin',
    label: 'Admin',
    scopeLabel: 'All operations',
    costVisibility: 'full',
  },
  sales: {
    id: 'sales',
    label: 'Sales',
    scopeLabel: 'Southeast territory',
    // A rep quoting from landed cost is how margin walks out of the building.
    costVisibility: 'gross-margin-only',
  },
  purchasing: {
    id: 'purchasing',
    label: 'Purchasing',
    scopeLabel: 'All vendors',
    costVisibility: 'full',
  },
  inventory: {
    id: 'inventory',
    label: 'Inventory',
    scopeLabel: 'Atlanta warehouse',
    costVisibility: 'hidden',
  },
  driver: {
    id: 'driver',
    label: 'Driver',
    scopeLabel: 'My assigned route',
    costVisibility: 'hidden',
  },
};

/** Every visible workspace has a native screen or an authenticated ERP fallback. */
export const builtWorkspaces = [
  'sales',
  'purchasing',
  'inventory',
  'warehouse',
  'routes',
  'finance',
  'reports',
  'data',
  'settings',
] as const;
