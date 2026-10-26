import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageStrategy } from './storage.types';

export interface S3StorageOptions {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

/** Any S3-compatible store (AWS S3, Cloudflare R2, MinIO). The bucket must block public access. */
export function createS3Storage(options: S3StorageOptions): StorageStrategy {
  const client = new S3Client({
    region: options.region,
    endpoint: options.endpoint,
    forcePathStyle: options.forcePathStyle,
    credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
  });
  const Bucket = options.bucket;
  return {
    name: 's3',
    put: async (Key, Body, ContentType) => {
      await client.send(
        new PutObjectCommand({ Bucket, Key, Body, ContentType, ServerSideEncryption: 'AES256' }),
      );
    },
    signedUploadUrl: (Key, ContentType, expiresIn) =>
      getSignedUrl(
        client,
        new PutObjectCommand({ Bucket, Key, ContentType, ServerSideEncryption: 'AES256' }),
        {
          expiresIn,
        },
      ),
    signedReadUrl: (Key, expiresIn) =>
      getSignedUrl(client, new GetObjectCommand({ Bucket, Key }), { expiresIn }),
    head: async (Key) => {
      try {
        const result = await client.send(new HeadObjectCommand({ Bucket, Key }));
        return { sizeBytes: result.ContentLength ?? 0, contentType: result.ContentType ?? null };
      } catch (error) {
        if (error instanceof NotFound) {
          return null;
        }
        throw error;
      }
    },
    read: async (Key) => {
      const result = await client.send(new GetObjectCommand({ Bucket, Key }));
      return Buffer.from(await result.Body!.transformToByteArray());
    },
    remove: async (Key) => {
      await client.send(new DeleteObjectCommand({ Bucket, Key }));
    },
  };
}
