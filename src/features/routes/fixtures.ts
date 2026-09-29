import type { RouteSummary } from './types';

export const demoRoute: RouteSummary = {
  id: 'route-a12',
  code: 'Route A-12',
  truck: 'Truck 04',
  progressLabel: '2 of 8 complete · back at the yard by 2:40 PM',
  stops: [
    {
      id: 'stop-1',
      sequence: 1,
      customerName: 'Northgate Provisions',
      note: 'Delivered 8:12 AM · signed',
      window: '8:00',
      state: 'delivered',
    },
    {
      id: 'stop-2',
      sequence: 2,
      customerName: 'Harbour Foods',
      note: 'Delivered 9:05 AM · signed',
      window: '9:00',
      state: 'delivered',
    },
    {
      id: 'stop-3',
      sequence: 3,
      customerName: 'Cedar Grove Catering',
      note: 'Arrived · rear loading entrance',
      window: '10:00',
      state: 'arrived',
    },
    {
      id: 'stop-4',
      sequence: 4,
      customerName: 'Riverside Market',
      note: 'Two lines short · customer notified',
      window: '11:15',
      state: 'exception',
    },
    {
      id: 'stop-5',
      sequence: 5,
      customerName: 'Lakeside Deli Supply',
      note: '4 cases · chilled',
      window: '12:00',
      state: 'upcoming',
    },
  ],
};
