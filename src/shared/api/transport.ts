export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface TransportRequest {
  method: HttpMethod;
  /** Path below `/api/v1`, starting with `/`. */
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers: Record<string, string>;
}

export interface TransportResponse {
  status: number;
  body: unknown;
}

/** Moves one request to an API (real HTTP or the in-memory mock). */
export type Transport = (request: TransportRequest) => Promise<TransportResponse>;

const REQUEST_TIMEOUT_MS = 20_000;

export function buildQuery(query: TransportRequest['query']): string {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

/** fetch-based transport against `${origin}/api/v1`. */
export function createHttpTransport(origin: string): Transport {
  const base = `${origin.replace(/\/$/, '')}/api/v1`;
  return async (request) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${base}${request.path}${buildQuery(request.query)}`, {
        method: request.method,
        headers: {
          Accept: 'application/json',
          ...(request.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...request.headers,
        },
        body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
      });
      const text = await response.text();
      let body: unknown = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = { message: text };
        }
      }
      return { status: response.status, body };
    } finally {
      clearTimeout(timer);
    }
  };
}
