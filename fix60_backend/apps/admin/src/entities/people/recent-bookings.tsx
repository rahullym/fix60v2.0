import type { ReactNode } from 'react';
import type { AdminBookingSummary } from '@fix60/shared';
import { formatDateTime, humanize } from '@/shared/lib/format';
import { Badge, EmptyState, Table, Td, Th } from '@/shared/ui/surfaces';

const tones = {
  confirmed: 'accent',
  service_started: 'accent',
  service_completed: 'success',
  cancelled: 'neutral',
  disputed: 'danger',
} as const;

/** Last bookings for a person. `counterpartLabel` names the other party's column. */
export function RecentBookings({ bookings, counterpartLabel }: { bookings: AdminBookingSummary[]; counterpartLabel: string }): ReactNode {
  if (bookings.length === 0) {
    return <EmptyState title="No bookings yet" />;
  }
  return (
    <Table>
      <thead><tr><Th>Booking</Th><Th>Service</Th><Th>{counterpartLabel}</Th><Th>Starts</Th><Th>Status</Th></tr></thead>
      <tbody>
        {bookings.map((booking) => (
          <tr key={booking.id}>
            <Td className="font-mono text-xs">{booking.code}</Td>
            <Td>{booking.serviceName}</Td>
            <Td>{booking.counterpartName}</Td>
            <Td className="whitespace-nowrap text-muted">{formatDateTime(booking.startsAt)}</Td>
            <Td><Badge tone={tones[booking.status]}>{humanize(booking.status)}</Badge></Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
