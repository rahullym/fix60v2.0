import { createHmac } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { safeEqual } from '../../common/crypto';
import type { StorageStrategy } from './storage.types';

export type LocalFileAction = 'read' | 'write';

/** HMAC over action, key and expiry; used by the dev file route to authorise access. */
export function signLocalFile(
  secret: string,
  action: LocalFileAction,
  key: string,
  expiresAt: number,
): string {
  return createHmac('sha256', secret).update(`${action}\n${key}\n${expiresAt}`).digest('base64url');
}

export function verifyLocalFileSignature(
  secret: string,
  action: LocalFileAction,
  key: string,
  expiresAt: number,
  signature: string,
  nowMs: number,
): boolean {
  return (
    expiresAt * 1000 > nowMs && safeEqual(signLocalFile(secret, action, key, expiresAt), signature)
  );
}

/** Resolves a storage key inside the root, rejecting path traversal. */
export function resolveLocalPath(rootDir: string, key: string): string {
  const root = path.resolve(process.cwd(), rootDir);
  const target = path.resolve(root, key);
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new Error('Storage key escapes the storage root');
  }
  return target;
}

/** Files on local disk with HMAC-signed URLs served by the API. Development only. */
export function createLocalStorage(
  rootDir: string,
  apiPublicUrl: string,
  signingSecret: string,
): StorageStrategy {
  const signedUrl = (action: LocalFileAction, key: string, expiresIn: number): string => {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    const query = new URLSearchParams({
      key,
      expires: String(expiresAt),
      signature: signLocalFile(signingSecret, action, key, expiresAt),
    });
    return `${apiPublicUrl.replace(/\/$/, '')}/api/v1/dev-files/${action}?${query.toString()}`;
  };
  return {
    name: 'local',
    put: async (key, body) => {
      const target = resolveLocalPath(rootDir, key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    },
    signedUploadUrl: async (key, _contentType, expiresIn) => signedUrl('write', key, expiresIn),
    signedReadUrl: async (key, expiresIn) => signedUrl('read', key, expiresIn),
    head: async (key) => {
      try {
        const info = await stat(resolveLocalPath(rootDir, key));
        return { sizeBytes: info.size, contentType: null };
      } catch {
        return null;
      }
    },
    read: (key) => readFile(resolveLocalPath(rootDir, key)),
    remove: async (key) => {
      await rm(resolveLocalPath(rootDir, key), { force: true });
    },
  };
}
