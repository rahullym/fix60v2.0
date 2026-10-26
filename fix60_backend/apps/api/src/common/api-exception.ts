import { HttpException, HttpStatus } from '@nestjs/common';
import { errorCodes, type ErrorCode } from '@fix60/shared';

/** HTTP error carrying a stable `code` for clients. */
export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message, status);
  }
}

export const badRequest = (code: ErrorCode, message: string): ApiException =>
  new ApiException(HttpStatus.BAD_REQUEST, code, message);

export const notFound = (what: string): ApiException =>
  new ApiException(HttpStatus.NOT_FOUND, errorCodes.notFound, `${what} not found`);

export const forbidden = (
  message = 'Not allowed',
  code: ErrorCode = errorCodes.forbidden,
): ApiException => new ApiException(HttpStatus.FORBIDDEN, code, message);

export const invalidTransition = (message: string): ApiException =>
  new ApiException(HttpStatus.CONFLICT, errorCodes.invalidStateTransition, message);

export const conflict = (code: ErrorCode, message: string): ApiException =>
  new ApiException(HttpStatus.CONFLICT, code, message);

export const unprocessable = (code: ErrorCode, message: string): ApiException =>
  new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, code, message);

export const unauthenticated = (
  message = 'Authentication required',
  code: ErrorCode = errorCodes.unauthenticated,
): ApiException => new ApiException(HttpStatus.UNAUTHORIZED, code, message);
