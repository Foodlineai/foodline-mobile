import type { IconName } from '@/components/ui';

/**
 * The "<Module> tools" directories — the right-hand phone in mockups 02, 03, 04.
 *
 * `route: null` renders the row disabled with "Coming soon" rather than hiding
 * it, so the demo shows the true shape of the product and nothing dead-ends.
 * `badge: 'view'` matches the small blue "View" chip in the designs.
 */
export type Tool = {
  key: string;
  label: string;
  icon: IconName;
  group: string;
  route: string | null;
  badge?: 'view';
};

export type ToolsModule = {
  slug: string;
  /** Shown in the context pill. */
  context: string;
  title: string;
  groups: string[];
  tools: Tool[];
};

export const TOOLS_MODULES: Record<string, ToolsModule> = {
  sales: {
    slug: 'sales',
    context: 'Sales',
    title: 'Sales tools',
    groups: ['Sales & customers', 'Supporting views', 'More'],
    tools: [
      { key: 'sales-orders', label: 'Sales orders', icon: 'file-text', group: 'Sales & customers', route: '/sales' },
      { key: 'customers', label: 'Customers', icon: 'users', group: 'Sales & customers', route: '/sales' },
      { key: 'shorts', label: 'Shorts & backorders', icon: 'alert-triangle', group: 'Sales & customers', route: null },
      { key: 'pricing', label: 'Pricing & contracts', icon: 'tag', group: 'Sales & customers', route: null, badge: 'view' },
      { key: 'credits', label: 'Credits & returns', icon: 'rotate-ccw', group: 'Sales & customers', route: null },
      { key: 'catalog', label: 'Product catalog', icon: 'box', group: 'Supporting views', route: '/inventory' },
      { key: 'stock', label: 'Stock availability', icon: 'bar-chart-2', group: 'Supporting views', route: '/inventory', badge: 'view' },
      { key: 'delivery', label: 'Delivery progress', icon: 'truck', group: 'Supporting views', route: '/routes', badge: 'view' },
      { key: 'documents', label: 'Documents', icon: 'file', group: 'More', route: null },
      { key: 'reports', label: 'Sales reports', icon: 'bar-chart-2', group: 'More', route: null },
      { key: 'help', label: 'Help & preferences', icon: 'settings', group: 'More', route: null },
    ],
  },

  purchasing: {
    slug: 'purchasing',
    context: 'Purchasing',
    title: 'Purchasing tools',
    groups: ['Purchasing', 'Receiving & stock', 'Supporting tools'],
    tools: [
      { key: 'vendors', label: 'Vendors', icon: 'users', group: 'Purchasing', route: null },
      { key: 'order-guide', label: 'Order guide', icon: 'clipboard', group: 'Purchasing', route: null },
      { key: 'pos', label: 'Purchase orders', icon: 'file-text', group: 'Purchasing', route: '/purchasing' },
      { key: 'issues', label: 'Receiving issues', icon: 'alert-triangle', group: 'Purchasing', route: null },
      { key: 'receiving', label: 'Receiving & putaway', icon: 'truck', group: 'Receiving & stock', route: '/receiving' },
      { key: 'catalog', label: 'Product catalog', icon: 'box', group: 'Receiving & stock', route: '/inventory' },
      { key: 'stock', label: 'Stock availability', icon: 'bar-chart-2', group: 'Receiving & stock', route: '/inventory', badge: 'view' },
      { key: 'traceability', label: 'Traceability', icon: 'grid', group: 'Receiving & stock', route: null, badge: 'view' },
      { key: 'costs', label: 'Costs & landed cost', icon: 'dollar-sign', group: 'Supporting tools', route: null },
      { key: 'finance', label: 'Finance', icon: 'bar-chart-2', group: 'Supporting tools', route: null, badge: 'view' },
      { key: 'docs', label: 'Documents & reports', icon: 'file', group: 'Supporting tools', route: null },
    ],
  },

  inventory: {
    slug: 'inventory',
    context: 'Inventory',
    title: 'Inventory tools',
    groups: ['Stock', 'Warehouse work', 'Supporting views'],
    tools: [
      { key: 'items', label: 'Items & locations', icon: 'box', group: 'Stock', route: '/inventory' },
      { key: 'lots', label: 'Lots & expiry', icon: 'tag', group: 'Stock', route: null },
      { key: 'counts', label: 'Cycle counts', icon: 'list', group: 'Stock', route: null },
      { key: 'transfers', label: 'Transfers & adjustments', icon: 'repeat', group: 'Stock', route: null },
      { key: 'traceability', label: 'Traceability', icon: 'share-2', group: 'Stock', route: null },
      { key: 'scanner', label: 'Scanner work', icon: 'maximize', group: 'Warehouse work', route: '/receiving' },
      { key: 'receiving', label: 'Receiving & putaway', icon: 'package', group: 'Warehouse work', route: '/receiving' },
      { key: 'pick', label: 'Pick & pack', icon: 'truck', group: 'Warehouse work', route: null },
      { key: 'orders', label: 'Sales orders', icon: 'file-text', group: 'Supporting views', route: '/sales', badge: 'view' },
      { key: 'delivery', label: 'Delivery progress', icon: 'bar-chart-2', group: 'Supporting views', route: '/routes', badge: 'view' },
      { key: 'documents', label: 'Documents', icon: 'file', group: 'Supporting views', route: null },
    ],
  },
};

export function toolsModule(slug: string | undefined): ToolsModule | null {
  return slug ? (TOOLS_MODULES[slug] ?? null) : null;
}
