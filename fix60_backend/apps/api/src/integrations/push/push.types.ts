/** String-only data payload delivered with the notification (FCM requirement). */
export type PushPayload = Record<string, string>;

export interface PushMessage {
  title?: string;
  body?: string;
  data: PushPayload;
}

export interface PushSendResult {
  /** Tokens the provider reported as permanently invalid; callers retire them. */
  invalidTokens: string[];
}

/** Push delivery backend. */
export interface PushStrategy {
  send: (tokens: string[], message: PushMessage) => Promise<PushSendResult>;
}

export const PUSH_STRATEGY = Symbol('PUSH_STRATEGY');
