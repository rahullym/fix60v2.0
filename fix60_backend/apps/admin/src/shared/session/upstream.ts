import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { ApiErrorBody, ErrorCode } from '@fix60/shared';
import { serverEnv } from '../config/server-env';

const FORWARDED_HEADERS = ['user-agent', 'x-request-id'];

export interface UpstreamResult {
  status: number;
  body: unknown;
}

/** Calls the Fix60 API from the server, forwarding client IP and user agent for audit logs. */
export async function callApi(
  request: NextRequest,
  method: string,
  path: string,
  options: { body?: string | null; accessToken?: string; search?: string } = {},
): Promise<UpstreamResult> {
  const headers = new Headers({ Accept: 'application/json' });
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    headers.set('x-forwarded-for', forwardedFor);
  }
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  }
  try {
    const response = await fetch(`${serverEnv.API_URL}/api/v1${path}${options.search ?? ''}`, {
      method,
      headers,
      body: options.body || undefined,
      cache: 'no-store',
    });
    const text = await response.text();
    return { status: response.status, body: text ? safeJson(text) : null };
  } catch {
    return { status: 502, body: errorBody(502, 'INTERNAL_ERROR', 'API unreachable') };
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export function errorBody(statusCode: number, code: ErrorCode, message: string): ApiErrorBody {
  return { statusCode, code, message, error: code, timestamp: new Date().toISOString() };
}

/** Relays an upstream result to the browser. */
export function relay({ status, body }: UpstreamResult): NextResponse {
  if (status === 204 || body === null) {
    return new NextResponse(null, { status });
  }
  return NextResponse.json(body, { status });
}
