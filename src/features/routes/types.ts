export type StopState = 'delivered' | 'arrived' | 'upcoming' | 'exception';

export type RouteStop = {
  id: string;
  /** 1-based position on the route. */
  sequence: number;
  customerName: string;
  /** "Delivered 8:12 AM · signed", "Two lines short · customer notified" */
  note: string;
  /** "8:00", "10:00–10:30" */
  window: string;
  state: StopState;
};

export type RouteSummary = {
  id: string;
  code: string;
  truck: string;
  /** "2 of 8 complete · back at the yard by 2:40 PM" */
  progressLabel: string;
  stops: RouteStop[];
};
