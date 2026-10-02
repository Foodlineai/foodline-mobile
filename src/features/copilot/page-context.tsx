import { usePathname } from 'expo-router';
import React, { createContext, useContext, useMemo, useRef } from 'react';

const LABELS: Record<string, string> = {
  '/': 'Home',
  '/my-work': 'My Work',
  '/activity': 'Activity',
  '/search': 'Search',
  '/more': 'Workspaces',
  '/sales': 'Sales & Customers',
  '/inventory': 'Inventory',
  '/purchasing': 'Purchasing',
  '/receiving': 'Receiving',
  '/routes': 'Routes & Delivery',
  '/account': 'Account',
};

const SEGMENT_LABELS: Record<string, string> = {
  item: 'Item',
  vendor: 'Vendor',
  customer: 'Customer',
  'sales-order': 'Sales order',
  purchasing: 'Purchase order',
  stop: 'Delivery stop',
  receiving: 'Receiving',
  recall: 'Recall',
  shipment: 'Shipment',
};

export function labelForPath(pathname: string): string {
  const exact = LABELS[pathname];
  if (exact) return exact;
  const first = pathname.split('/').filter(Boolean)[0];
  return (first && SEGMENT_LABELS[first]) || 'Foodline';
}

export type PageContext = { pathname: string; title: string };

const Ctx = createContext<PageContext>({ pathname: '/', title: 'Home' });

/**
 * Remembers the screen the user was last on that isn't the AI tab itself, so
 * the Copilot is page-aware about where they came from. Mobile paths are not
 * the ERP's web paths: the ERP's own page-awareness keys on web routes, so it
 * will treat these as generic pages and lean on the title.
 */
export function PageContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const last = useRef<PageContext>({ pathname: '/', title: 'Home' });
  if (pathname !== '/ai') last.current = { pathname, title: labelForPath(pathname) };
  const value = useMemo(() => last.current, [last.current.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePageContext(): PageContext {
  return useContext(Ctx);
}
