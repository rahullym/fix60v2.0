import { env } from '../config/env';
import { session } from '../auth/session';
import { ApiError } from './api-error';
import { createHttpTransport, type HttpMethod, type Transport, type TransportRequest } from './transport';
import type { ApiErrorBody, AuthTokens } from './types';

let transport: Transport = createHttpTransport(env.apiUrl);
let appCheckTokenProvider: (() => Promise<string | null>) | null = null;
let refreshInFlight: Promise<AuthTokens | null> | null = null;

/** Swaps the transport (the mock API installs itself here). */
export function setTransport(next: Transport): void {
  transport = next;
}

/** Optional Firebase App Check token for sign-in endpoints. */
export function setAppCheckTokenProvider(provider: (() => Promise<string | null>) | null): void {
  appCheckTokenProvider = provider;
}

export interface RequestOptions {
  query?: TransportRequest['query'];
  body?: unknown;
  /** Send the access token (default true). */
  isAuthenticated?: boolean;
  /** Attach X-Firebase-AppCheck. */
  withAppCheck?: boolean;
}

async function send(method: HttpMethod, path: string, options: RequestOptions): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  const accessToken = session.getState().tokens?.accessToken;
  if (options.isAuthenticated !== false && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (options.withAppCheck && appCheckTokenProvider) {
    const token = await appCheckTokenProvider();
    if (token) {
      headers['X-Firebase-AppCheck'] = token;
    }
  }
  try {
    return await transport({ method, path, query: options.query, body: options.body, headers });
  } catch {
    throw new ApiError(0, { message: 'Network request failed' }, 'NETWORK_ERROR');
  }
}

/** Rotates the refresh token once for all concurrent callers. Clears the session on failure. */
export function refreshSession(): Promise<AuthTokens | null> {
  const refreshToken = session.getState().tokens?.refreshToken;
  if (!refreshToken) {
    return Promise.resolve(null);
  }
  refreshInFlight ??= (async () => {
    try {
      const response = await send('POST', '/auth/refresh', { body: { refreshToken }, isAuthenticated: false });
      if (response.status >= 200 && response.status < 300) {
        const tokens = response.body as AuthTokens;
        await session.setTokens(tokens);
        return tokens;
      }
      await session.clear();
      return null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Calls `/api/v1{path}`; throws ApiError on non-2xx. Retries once after refreshing an expired token. */
export async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(method, path, options);
  const errorBody = response.body as Partial<ApiErrorBody> | null;
  const isExpired =
    response.status === 401 &&
    options.isAuthenticated !== false &&
    (errorBody?.code === 'TOKEN_EXPIRED' || errorBody?.code === 'UNAUTHENTICATED');
  if (isExpired) {
    const tokens = await refreshSession();
    if (tokens) {
      response = await send(method, path, options);
    }
  }
  if (response.status < 200 || response.status >= 300) {
    throw new ApiError(response.status, response.body as Partial<ApiErrorBody> | null);
  }
  return (response.status === 204 ? undefined : response.body) as T;
}

/** PUTs a local file (file:// URI) to a pre-signed upload URL. */
export async function uploadToSignedUrl(uploadUrl: string, fileUri: string, headers: Record<string, string>): Promise<void> {
  if (uploadUrl.startsWith('mock://')) {
    return;
  }
  const blob = await (await fetch(fileUri)).blob();
  const response = await fetch(uploadUrl, { method: 'PUT', headers, body: blob });
  if (!response.ok) {
    throw new ApiError(response.status, { message: 'Upload failed' }, 'UPLOAD_FAILED');
  }
}
