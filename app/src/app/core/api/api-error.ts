import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from './contract';

/**
 * A failure with something a person can read. RF-5 asks the screen to say what
 * happened, so the stub's own error.message is preferred over anything invented
 * here, and the fallbacks only cover the cases where there is no body to quote.
 */
export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly status: number;
}

function hasErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const { error } = body as { error: unknown };
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { message?: unknown }).message === 'string' &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

export function toApiError(cause: unknown): ApiError {
  if (!(cause instanceof HttpErrorResponse)) {
    return { code: 'unknown', message: 'Something went wrong.', status: 0 };
  }
  if (hasErrorBody(cause.error)) {
    return { code: cause.error.error.code, message: cause.error.error.message, status: cause.status };
  }
  if (cause.status === 0) {
    return {
      code: 'network_unreachable',
      message: 'Could not reach the server. Check that the stub is running on port 4010.',
      status: 0,
    };
  }
  return { code: 'unexpected_response', message: `The server answered ${cause.status}.`, status: cause.status };
}
