import type { IconName } from '@/components/ui';

/**
 * The module directory from mockup 01 ("All workspaces").
 * `route` is null where the screen does not exist yet — those rows render
 * disabled rather than being hidden, so the demo shows the real shape of the
 * product and nothing dead-ends silently.
 */
export type Workspace = {
  key: string;
  label: string;
  icon: IconName;
  group: WorkspaceGroup;
  route: string | null;
};

export type WorkspaceGroup = 'Operations' | 'Business' | 'Administration';

export const WORKSPACE_GROUPS: WorkspaceGroup[] = ['Operations', 'Business', 'Administration'];

export const WORKSPACES: Workspace[] = [
  { key: 'sales', label: 'Sales & Customers', icon: 'users', group: 'Operations', route: '/sales' },
  { key: 'purchasing', label: 'Purchasing', icon: 'shopping-cart', group: 'Operations', route: '/purchasing' },
  { key: 'inventory', label: 'Inventory', icon: 'box', group: 'Operations', route: '/inventory' },
  { key: 'warehouse', label: 'Warehouse', icon: 'home', group: 'Operations', route: '/receiving' },
  { key: 'routes', label: 'Routes & Delivery', icon: 'truck', group: 'Operations', route: '/routes' },
  { key: 'finance', label: 'Finance', icon: 'bar-chart-2', group: 'Business', route: null },
  { key: 'reports', label: 'Reports & Activity', icon: 'file-text', group: 'Business', route: '/(app)/(tabs)/activity' },
  { key: 'data', label: 'Data & Integrations', icon: 'share-2', group: 'Business', route: null },
  { key: 'settings', label: 'Company settings', icon: 'settings', group: 'Administration', route: null },
];
