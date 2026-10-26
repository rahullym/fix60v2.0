import type { HttpMethod, Transport, TransportRequest, TransportResponse } from '../transport';
import type { ErrorCode, UserRole } from '../types';

export interface MockContext {
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  /** Authenticated caller, resolved from the bearer token. */
  auth: { userId: string; role: UserRole } | null;
}

export type MockResult = TransportResponse | unknown;
export type MockHandler = (context: MockContext) => MockResult | Promise<MockResult>;

interface Route {
  method: HttpMethod;
  pattern: RegExp;
  keys: string[];
  handler: MockHandler;
  isPublic: boolean;
}

const routes: Route[] = [];

/** Thrown by handlers to produce an API error body. */
export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const mockError = (status: number, code: ErrorCode, message: string = code): MockHttpError =>
  new MockHttpError(status, code, message);

/** Registers a route. Path params use `:name`. Routes are authenticated unless `isPublic`. */
export function route(method: HttpMethod, path: string, handler: MockHandler, options: { isPublic?: boolean } = {}): void {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:([a-zA-Z]+)/g, (_, key: string) => {
      keys.push(key);
      return '([^/]+)';
    })}$`,
  );
  routes.push({ method, pattern, keys, handler, isPublic: options.isPublic ?? false });
}

/** Shorthand for a 2xx with a body. */
export const ok = (body: unknown, status = 200): TransportResponse => ({ status, body });
export const noContent = (): TransportResponse => ({ status: 204, body: null });

function isTransportResponse(value: unknown): value is TransportResponse {
  return typeof value === 'object' && value !== null && 'status' in value && 'body' in value && Object.keys(value).length === 2;
}

function errorBody(status: number, code: ErrorCode, message: string): TransportResponse {
  return {
    status,
    body: { statusCode: status, code, message, error: code, timestamp: new Date().toISOString() },
  };
}

const LATENCY_MS = 250;

/** Builds the in-memory transport. `resolveAuth` maps a bearer token to a caller. */
export function createMockTransport(
  resolveAuth: (token: string) => MockContext['auth'] | 'expired',
): Transport {
  return async (request: TransportRequest) => {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
    const match = routes
      .filter((candidate) => candidate.method === request.method)
      .map((candidate) => ({ candidate, result: candidate.pattern.exec(request.path) }))
      .find((entry) => entry.result !== null);
    if (!match || !match.result) {
      return errorBody(404, 'NOT_FOUND', `Mock route not found: ${request.method} ${request.path}`);
    }
    const header = request.headers.Authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const resolved = token ? resolveAuth(token) : null;
    if (resolved === 'expired') {
      return errorBody(401, 'TOKEN_EXPIRED', 'Access token expired');
    }
    if (!match.candidate.isPublic && !resolved) {
      return errorBody(401, 'UNAUTHENTICATED', 'Authentication required');
    }
    const params = Object.fromEntries(
      match.candidate.keys.map((key, index) => [key, decodeURIComponent(match.result![index + 1] ?? '')]),
    );
    const query = Object.fromEntries(
      Object.entries(request.query ?? {})
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => [key, String(value)]),
    );
    try {
      const result = await match.candidate.handler({ params, query, body: request.body, auth: resolved });
      if (isTransportResponse(result)) {
        return result;
      }
      return result === undefined ? { status: 204, body: null } : { status: 200, body: result };
    } catch (error) {
      if (error instanceof MockHttpError) {
        return errorBody(error.status, error.code, error.message);
      }
      console.error('[mock-api]', error);
      return errorBody(500, 'INTERNAL_ERROR', 'Mock handler crashed');
    }
  };
}

/** Requires a caller with the given role. */
export function requireRole(context: MockContext, role: UserRole): { userId: string; role: UserRole } {
  if (!context.auth || context.auth.role !== role) {
    throw mockError(403, 'FORBIDDEN', 'Wrong role');
  }
  return context.auth;
}
