import { ApiResponse, PaginationMeta } from '../types';

export function createResponse<T>(
  success: boolean,
  message: string,
  data?: T,
  error?: string,
  meta?: PaginationMeta,
): ApiResponse<T> {
  return {
    success,
    message,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    ...(meta && { meta }),
  };
}
