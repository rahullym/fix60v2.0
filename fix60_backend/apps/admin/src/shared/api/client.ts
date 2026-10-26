import type { ApiErrorBody, ErrorCode } from '@fix60/shared';

/** Error for every failed dashboard call. Screens map `code`, never the server `message`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK_ERROR' | undefined;
  readonly issues: { path: string; message: string }[];

  constructor(status: number, body: Partial<ApiErrorBody> | null, fallback?: 'NETWORK_ERROR') {
    super(body?.message ?? `Request failed (${status})`);
    this.status = status;
    this.code = body?.code ?? fallback;
    this.issues = body?.issues ?? [];
  }
}

let refreshInFlight: Promise<boolean> | null = null;

/** One refresh at a time per tab; the API revokes the session if a refresh token is reused. */
function refreshOnce(): Promise<boolean> {
  refreshInFlight ??= fetch('/bff/auth/refresh', { method: 'POST' })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function toLogin(): void {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    const next = encodeURIComponent(window.location.pathname);
    window.location.assign(`/login?next=${next}`);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function queryString(query: Query | undefined): string {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

async function send(url: string, method: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/** Calls the API through the dashboard proxy (`/bff/api/*`), refreshing an expired session once. */
export async function api<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  options: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const url = `/bff/api${path}${queryString(options.query)}`;
  let response: Response;
  try {
    response = await send(url, method, options.body);
    if (response.status === 401) {
      const body = (await response.clone().json().catch(() => null)) as Partial<ApiErrorBody> | null;
      if (body?.code === 'TOKEN_EXPIRED' && (await refreshOnce())) {
        response = await send(url, method, options.body);
      }
    }
  } catch {
    throw new ApiError(0, null, 'NETWORK_ERROR');
  }
  if (response.status === 401) {
    toLogin();
  }
  if (!response.ok) {
    throw new ApiError(response.status, (await parseBody(response).catch(() => null)) as Partial<ApiErrorBody> | null);
  }
  return (response.status === 204 ? undefined : await parseBody(response)) as T;
}

/** Calls a dashboard auth route (`/bff/auth/*`). */
export async function authCall<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await send(`/bff/auth${path}`, 'POST', body);
  } catch {
    throw new ApiError(0, null, 'NETWORK_ERROR');
  }
  if (!response.ok) {
    throw new ApiError(response.status, (await parseBody(response).catch(() => null)) as Partial<ApiErrorBody> | null);
  }
  return (response.status === 204 ? undefined : await parseBody(response)) as T;
}
