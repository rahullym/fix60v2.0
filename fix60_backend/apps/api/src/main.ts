import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import type { ApiEnv } from '@fix60/shared';
import { AppModule } from './app.module';
import { API_ENV } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const env = app.get<ApiEnv>(API_ENV);

  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }
  app.disable('x-powered-by');
  app.use(helmet());
  app.useBodyParser('json', { limit: '1mb' });
  app.enableCors({
    origin: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: false,
  });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  await app.listen(env.API_PORT);
  Logger.log(`API listening on ${env.API_PUBLIC_URL}/api/v1`, 'Bootstrap');
}

void bootstrap();
