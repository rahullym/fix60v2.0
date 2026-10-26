import { Global, Module } from '@nestjs/common';
import type { ApiEnv } from '@fix60/shared';
import { API_ENV } from '../../config/env';
import { createStrategyRegistry } from '../../common/strategy-registry';
import { createLocalStorage } from './local-storage';
import { createS3Storage } from './s3-storage';
import { STORAGE_STRATEGY, type StorageStrategy } from './storage.types';

/** Registers storage backends and selects one by STORAGE_PROVIDER. */
function selectStorage(env: ApiEnv): StorageStrategy {
  const registry = createStrategyRegistry<() => StorageStrategy>('storage');
  registry.register('local', () =>
    createLocalStorage(env.STORAGE_LOCAL_DIR, env.API_PUBLIC_URL, env.JWT_SECRET),
  );
  registry.register('s3', () =>
    createS3Storage({
      bucket: env.S3_BUCKET ?? '',
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    }),
  );
  return registry.get(env.STORAGE_PROVIDER)();
}

@Global()
@Module({
  providers: [{ provide: STORAGE_STRATEGY, inject: [API_ENV], useFactory: selectStorage }],
  exports: [STORAGE_STRATEGY],
})
export class StorageModule {}
