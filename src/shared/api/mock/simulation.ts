import { db } from './db';
import { acceptInvitation, addSupportAutoReply, approveApplication, DEMO_PROVIDER_PHONE, refreshInvitation, startApplicationReview } from './lifecycle';

/** Delay before seeded providers auto-accept a new request. */
export const AUTO_ACCEPT_DELAY_MS = 6_000;
/** submitted → under_review delay. */
export const REVIEW_START_DELAY_MS = 3_000;
/** submitted → approved delay. */
export const APPROVAL_DELAY_MS = 8_000;
/** Delay before the canned support reply. */
export const SUPPORT_REPLY_DELAY_MS = 4_000;
/** How many seeded providers auto-accept a quick request. */
export const AUTO_ACCEPT_COUNT = 2;

/** setTimeout that can never throw into the transport. */
function later(delayMs: number, task: () => void): void {
  setTimeout(() => {
    try {
      task();
    } catch (error) {
      console.warn('[mock-api] simulation step skipped', error);
    }
  }, delayMs);
}

/**
 * ~6 s after a request is created, up to two invited seeded providers accept it
 * (one for a directed request). The demo provider never auto-accepts.
 */
export function scheduleAutoAccept(requestCode: string): void {
  later(AUTO_ACCEPT_DELAY_MS, () => {
    const request = db.requests.get(requestCode);
    if (!request) return;
    const limit = request.source === 'directed' ? 1 : AUTO_ACCEPT_COUNT;
    const candidates = [...db.invitations.values()]
      .filter((invitation) => invitation.requestCode === requestCode)
      .map((invitation) => refreshInvitation(invitation))
      .filter((invitation) => {
        const provider = db.providers.get(invitation.providerId);
        const phone = db.users.get(invitation.providerId)?.phone;
        return (invitation.status === 'invited' || invitation.status === 'viewed') && provider?.isSimulated === true && phone !== DEMO_PROVIDER_PHONE;
      })
      .slice(0, limit);
    for (const invitation of candidates) {
      try {
        acceptInvitation(invitation);
      } catch {
        // The request moved on (cancelled, confirmed or slot taken); nothing to simulate.
      }
    }
  });
}

/** Moves a submitted application to under_review (~3 s) then approved (~8 s). */
export function scheduleApplicationReview(userId: string, submittedAt: string): void {
  later(REVIEW_START_DELAY_MS, () => startApplicationReview(userId, submittedAt));
  later(APPROVAL_DELAY_MS, () => approveApplication(userId, submittedAt));
}

/** Posts the canned support reply ~4 s after a user message. */
export function scheduleSupportReply(ticketCode: string, userMessageId: string): void {
  later(SUPPORT_REPLY_DELAY_MS, () => addSupportAutoReply(ticketCode, userMessageId));
}
