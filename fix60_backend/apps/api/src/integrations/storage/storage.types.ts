/** Private object storage. Nothing is publicly readable; reads go through short-lived signed URLs. */
export interface StorageStrategy {
  readonly name: string;
  put: (key: string, body: Buffer, contentType: string) => Promise<void>;
  /** Pre-signed upload URL so large files go straight from the client to storage. */
  signedUploadUrl: (key: string, contentType: string, expiresInSeconds: number) => Promise<string>;
  signedReadUrl: (key: string, expiresInSeconds: number) => Promise<string>;
  /** Object metadata after a direct upload, or null when nothing was uploaded. */
  head: (key: string) => Promise<{ sizeBytes: number; contentType: string | null } | null>;
  read: (key: string) => Promise<Buffer>;
  remove: (key: string) => Promise<void>;
}

export const STORAGE_STRATEGY = Symbol('STORAGE_STRATEGY');
