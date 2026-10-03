import type { DeliveryRoute, DeliveryStop } from '@/lib/api';
import type { RouteStop, RouteSummary, StopState } from './types';

/**
 * Maps this app's existing `DeliveryRoute`/`DeliveryStop` (already live-wired
 * via `get_current_delivery_route_workspace`) onto the delivered `RouteScreen`'s
 * view model. Nothing new confirmed here — this is a presentation reshape of
 * data already flowing through the app, not new backend wiring.
 */

const STATE_MAP: Record<DeliveryStop['state'], StopState> = {
  completed: 'delivered',
  arrived: 'arrived',
  planned: 'upcoming',
  skipped: 'exception',
  failed: 'exception',
};

const STATE_NOTE: Record<DeliveryStop['state'], string> = {
  completed: 'Delivered',
  arrived: 'Arrived — next to confirm',
  planned: 'Not yet started',
  skipped: 'Skipped',
  failed: 'Delivery exception',
};

function toRouteStop(stop: DeliveryStop): RouteStop {
  return {
    id: stop.id,
    sequence: stop.sequence,
    customerName: stop.customerName,
    // The delivered type wants a status line ("Delivered 8:12 AM · signed").
    // There's no per-stop arrival-instructions field on the list RPC to
    // prefer over this — confirmed, it isn't in the payload — so this is
    // always the status-shaped note.
    note: STATE_NOTE[stop.state],
    window: stop.windowLabel ?? stop.address,
    state: STATE_MAP[stop.state],
  };
}

export function toRouteSummary(route: DeliveryRoute): RouteSummary {
  return {
    id: route.id,
    code: route.code,
    truck: route.vehicleLabel ?? 'Unassigned',
    progressLabel: `${route.stopsComplete} of ${route.stopsTotal} complete`,
    stops: route.stops.map(toRouteStop),
  };
}
