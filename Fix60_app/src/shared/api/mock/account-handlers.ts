import type { ConsentState, ConsentType, ReportReason, SupportTicket, SupportTicketDetail } from '../types';
import { db, newId, nowIso, type MockTicket } from './db';
import { mockError, noContent, ok, route } from './router';
import { scheduleSupportReply } from './simulation';
import { asObject, invalid, optionalText, pageParams, paginate, requireText } from './validation';

/** Policy version reported on every consent row. */
export const POLICY_VERSION = '0.1-draft';
const CONSENT_TYPES: ConsentType[] = [
  'terms',
  'privacy',
  'safety_policy',
  'service_communications',
  'whatsapp_updates',
  'marketing',
  'provider_declaration',
];
const ALWAYS_GRANTED: ConsentType[] = ['terms', 'privacy', 'safety_policy'];
const REPORT_REASONS: ReportReason[] = [
  'harassment',
  'unsafe_behaviour',
  'false_information',
  'inappropriate_request',
  'payment_issue',
  'misconduct',
  'other',
];
const DELETION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

function consentList(userId: string): { items: ConsentState[] } {
  const user = db.requireUser(userId);
  const updatedAt = db.consentUpdatedAt.get(userId) ?? {};
  return {
    items: CONSENT_TYPES.map((type) => ({
      type,
      isGranted: ALWAYS_GRANTED.includes(type) ? true : user.consents[type],
      policyVersion: POLICY_VERSION,
      updatedAt: updatedAt[type] ?? user.createdAt,
    })),
  };
}

function ticketSummary(ticket: MockTicket): SupportTicket {
  return {
    code: ticket.code,
    subject: ticket.subject,
    status: ticket.status,
    bookingCode: ticket.bookingCode,
    lastMessageAt: ticket.messages.at(-1)?.createdAt ?? null,
    createdAt: ticket.createdAt,
  };
}

function ticketDetail(ticket: MockTicket): SupportTicketDetail {
  return { ...ticketSummary(ticket), messages: [...ticket.messages] };
}

function ownTicket(code: string, userId: string): MockTicket {
  const ticket = db.tickets.get(code);
  if (!ticket) {
    throw mockError(404, 'NOT_FOUND', 'Ticket not found');
  }
  if (ticket.userId !== userId) {
    throw mockError(403, 'FORBIDDEN', 'Not your ticket');
  }
  return ticket;
}

function addUserMessage(ticket: MockTicket, userId: string, body: string): void {
  const message = { id: newId(), body, isFromSupport: false, senderName: db.requireUser(userId).fullName, createdAt: nowIso() };
  ticket.messages.push(message);
  ticket.status = 'open';
  scheduleSupportReply(ticket.code, message.id);
}

/** /me extras, safety, support and notifications (both roles). */
export function registerAccountRoutes(): void {
  route('GET', '/me/consents', ({ auth }) => consentList(auth!.userId));

  route('PUT', '/me/consents', ({ auth, body }) => {
    const user = db.requireUser(auth!.userId);
    const input = asObject(body);
    const changes: [keyof typeof input, ConsentType][] = [
      ['serviceCommunications', 'service_communications'],
      ['whatsappUpdates', 'whatsapp_updates'],
      ['marketing', 'marketing'],
    ];
    const stamps = { ...db.consentUpdatedAt.get(user.id) };
    for (const [field, type] of changes) {
      const value = input[field];
      if (value === undefined) continue;
      if (typeof value !== 'boolean') throw invalid(`${field} must be a boolean`);
      if (user.consents[type] !== value) {
        user.consents[type] = value;
        stamps[type] = nowIso();
      }
    }
    db.consentUpdatedAt.set(user.id, stamps);
    return consentList(user.id);
  });

  route('GET', '/me/deletion-request', ({ auth }) => {
    const user = db.requireUser(auth!.userId);
    return { status: user.deletionScheduledFor ? 'scheduled' : 'none', scheduledFor: user.deletionScheduledFor };
  });

  route('POST', '/me/deletion-request', ({ auth }) => {
    const user = db.requireUser(auth!.userId);
    user.deletionScheduledFor ??= new Date(Date.now() + DELETION_GRACE_MS).toISOString();
    user.status = 'pending_deletion';
    return { status: 'scheduled', scheduledFor: user.deletionScheduledFor };
  });

  route('DELETE', '/me/deletion-request', ({ auth }) => {
    const user = db.requireUser(auth!.userId);
    user.deletionScheduledFor = null;
    if (user.status === 'pending_deletion') user.status = 'active';
    return { status: 'none', scheduledFor: null };
  });

  route('POST', '/me/devices', ({ auth, body }) => {
    const input = asObject(body);
    const token = requireText(input.token, 'token', 4096);
    if (input.platform !== 'ios' && input.platform !== 'android' && input.platform !== 'web') {
      throw invalid('platform must be ios, android or web');
    }
    const devices = (db.devices.get(auth!.userId) ?? []).filter((device) => device.token !== token);
    devices.push({ token, platform: input.platform, registeredAt: nowIso() });
    db.devices.set(auth!.userId, devices);
    return noContent();
  });

  route('POST', '/reports', ({ auth, body }) => {
    const input = asObject(body);
    const subjectUserId = requireText(input.subjectUserId, 'subjectUserId', 64);
    if (subjectUserId === auth!.userId) {
      throw invalid('You cannot report yourself');
    }
    if (!db.users.has(subjectUserId)) {
      throw invalid('Unknown subjectUserId');
    }
    if (typeof input.reason !== 'string' || !REPORT_REASONS.includes(input.reason as ReportReason)) {
      throw invalid('Unknown reason');
    }
    const report = {
      code: db.nextCode('report'),
      status: 'open' as const,
      createdAt: nowIso(),
      reporterId: auth!.userId,
      subjectUserId,
      reason: input.reason as ReportReason,
      details: optionalText(input.details, 'details', 2000),
      bookingCode: optionalText(input.bookingCode, 'bookingCode', 40),
      requestCode: optionalText(input.requestCode, 'requestCode', 40),
    };
    db.reports.push(report);
    return ok({ code: report.code, status: report.status, createdAt: report.createdAt }, 201);
  });

  route('GET', '/blocks', ({ auth }) => ({
    items: db.blocks
      .filter((block) => block.blockerId === auth!.userId)
      .sort((a, b) => b.blockedAt.localeCompare(a.blockedAt))
      .map((block) => ({ userId: block.blockedId, displayName: db.users.get(block.blockedId)?.fullName ?? 'Fix60 user', blockedAt: block.blockedAt })),
  }));

  route('POST', '/blocks', ({ auth, body }) => {
    const userId = requireText(asObject(body).userId, 'userId', 64);
    if (userId === auth!.userId) {
      throw invalid('You cannot block yourself');
    }
    if (!db.users.has(userId)) {
      throw mockError(404, 'NOT_FOUND', 'User not found');
    }
    if (!db.blocks.some((block) => block.blockerId === auth!.userId && block.blockedId === userId)) {
      db.blocks.push({ blockerId: auth!.userId, blockedId: userId, blockedAt: nowIso() });
    }
    return noContent();
  });

  route('DELETE', '/blocks/:userId', ({ auth, params }) => {
    db.blocks = db.blocks.filter((block) => !(block.blockerId === auth!.userId && block.blockedId === params.userId));
    return noContent();
  });

  route('GET', '/support/tickets', ({ auth }) => ({
    items: [...db.tickets.values()]
      .filter((ticket) => ticket.userId === auth!.userId)
      .map(ticketSummary)
      .sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt)),
  }));

  route('POST', '/support/tickets', ({ auth, body }) => {
    const input = asObject(body);
    const subject = requireText(input.subject, 'subject', 200);
    const message = requireText(input.message, 'message', 4000);
    const bookingCode = optionalText(input.bookingCode, 'bookingCode', 40);
    if (bookingCode) {
      const booking = db.bookings.get(bookingCode);
      if (!booking || (booking.customerId !== auth!.userId && booking.providerId !== auth!.userId)) {
        throw invalid('Unknown bookingCode');
      }
    }
    const ticket: MockTicket = {
      code: db.nextCode('ticket'),
      userId: auth!.userId,
      subject,
      status: 'open',
      bookingCode,
      createdAt: nowIso(),
      messages: [],
    };
    db.tickets.set(ticket.code, ticket);
    addUserMessage(ticket, auth!.userId, message);
    return ok(ticketDetail(ticket), 201);
  });

  route('GET', '/support/tickets/:code', ({ auth, params }) => ticketDetail(ownTicket(params.code ?? '', auth!.userId)));

  route('POST', '/support/tickets/:code/messages', ({ auth, params, body }) => {
    const ticket = ownTicket(params.code ?? '', auth!.userId);
    addUserMessage(ticket, auth!.userId, requireText(asObject(body).body, 'body', 4000));
    return ticketDetail(ticket);
  });

  route('GET', '/notifications', ({ auth, query }) => {
    const mine = db.notifications
      .filter((notification) => notification.userId === auth!.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ userId: _userId, ...notification }) => notification);
    const { page, pageSize } = pageParams(query, 30);
    return { ...paginate(mine, page, pageSize), unreadCount: mine.filter((notification) => !notification.isRead).length };
  });

  route('POST', '/notifications/read-all', ({ auth }) => {
    db.notifications.forEach((notification) => {
      if (notification.userId === auth!.userId) notification.isRead = true;
    });
    return noContent();
  });

  route('POST', '/notifications/:id/read', ({ auth, params }) => {
    const notification = db.notifications.find((candidate) => candidate.id === params.id && candidate.userId === auth!.userId);
    if (!notification) {
      throw mockError(404, 'NOT_FOUND', 'Notification not found');
    }
    notification.isRead = true;
    return noContent();
  });
}
