import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { errorCodes, type ApiErrorBody, type ErrorCode } from '@fix60/shared';
import { ApiException } from './api-exception';

const statusCodeMap: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: errorCodes.validationFailed,
  [HttpStatus.UNAUTHORIZED]: errorCodes.unauthenticated,
  [HttpStatus.FORBIDDEN]: errorCodes.forbidden,
  [HttpStatus.NOT_FOUND]: errorCodes.notFound,
  [HttpStatus.CONFLICT]: errorCodes.conflict,
  [HttpStatus.PAYLOAD_TOO_LARGE]: errorCodes.validationFailed,
  [HttpStatus.UNPROCESSABLE_ENTITY]: errorCodes.validationFailed,
  [HttpStatus.TOO_MANY_REQUESTS]: errorCodes.rateLimited,
};

function messageOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  const message = (response as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  return typeof message === 'string' ? message : exception.message;
}

/** Renders every error as `{ statusCode, message, error, timestamp, requestId, code }`. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request & { requestId?: string }>();
    const timestamp = new Date().toISOString();
    const requestId = request.requestId;

    let body: ApiErrorBody;
    if (exception instanceof ZodError) {
      body = {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Request validation failed',
        code: errorCodes.validationFailed,
        issues: exception.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        timestamp,
        requestId,
      };
    } else if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      body = {
        statusCode,
        error: HttpStatus[statusCode] ?? 'Error',
        message: messageOf(exception),
        code: exception instanceof ApiException ? exception.code : statusCodeMap[statusCode],
        timestamp,
        requestId,
      };
    } else {
      this.logger.error(
        `${request.method} ${request.path} failed (requestId=${requestId ?? '-'})`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      body = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Unexpected error',
        code: errorCodes.internal,
        timestamp,
        requestId,
      };
    }
    response.status(body.statusCode).json(body);
  }
}
