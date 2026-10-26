import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Tags each request with an id (honours an incoming `x-request-id`). */
export function requestIdMiddleware(
  request: Request & { requestId?: string },
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.header('x-request-id');
  const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
}
