import { isIP } from 'node:net';
import type { Request } from 'express';

/** Caller metadata recorded on sessions and audit entries. */
export interface RequestMeta {
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

/** Reads IP (honours `trust proxy`), user agent and request id. */
export function requestMeta(request: Request & { requestId?: string }): RequestMeta {
  const ip = request.ip?.replace(/^::ffff:/, '') ?? null;
  return {
    requestId: request.requestId ?? null,
    ipAddress: ip && isIP(ip) ? ip : null,
    userAgent: request.header('user-agent')?.slice(0, 300) ?? null,
  };
}
