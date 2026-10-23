import type { QueryKey } from '@tanstack/react-query';
import type { UserRole } from '@/shared/api/types';

/** FCM `data` payload (values are strings per the contract). */
export type PushData = Record<string, string | object | undefined>;

export type PushType = 'invitation' | 'request_update' | 'booking_update' | 'support_reply' | 'application_update';

function field(data: PushData, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

const enc = encodeURIComponent;

/** In-app route for a tapped push, per docs/api-contract.md. Null when the payload is unknown or incomplete. */
export function pushHref(data: PushData | undefined, sessionRole: UserRole | undefined): string | null {
  if (!data) {
    return null;
  }
  switch (field(data, 'type')) {
    case 'invitation': {
      const id = field(data, 'invitationId');
      return id ? `/provider/invitations/${enc(id)}` : '/provider';
    }
    case 'request_update': {
      const code = field(data, 'requestCode');
      return code ? `/customer/requests/${enc(code)}` : '/customer';
    }
    case 'booking_update': {
      const code = field(data, 'bookingCode');
      const payloadRole = field(data, 'role');
      const role = payloadRole === 'customer' || payloadRole === 'provider' ? payloadRole : sessionRole;
      if (!role) {
        return null;
      }
      return code ? `/${role}/bookings/${enc(code)}` : `/${role}`;
    }
    case 'support_reply': {
      const code = field(data, 'ticketCode');
      return code ? `/support/${enc(code)}` : '/support';
    }
    case 'application_update':
      return '/provider';
    default:
      return field(data, 'linkPath');
  }
}

const keysByType: Record<PushType, QueryKey[]> = {
  invitation: [['invitations'], ['invitation'], ['provider-me']],
  request_update: [['requests'], ['request']],
  booking_update: [['bookings'], ['booking'], ['provider-bookings'], ['provider-booking'], ['requests'], ['request'], ['provider-me']],
  support_reply: [['support-tickets'], ['support-ticket']],
  application_update: [['application'], ['provider-me'], ['documents']],
};

/** Query roots to refresh when a push arrives in the foreground. Always includes the inbox. */
export function pushQueryKeys(data: PushData | undefined): QueryKey[] {
  const type = data ? field(data, 'type') : null;
  const extra = type && type in keysByType ? keysByType[type as PushType] : [];
  return [['notifications'], ...extra];
}
