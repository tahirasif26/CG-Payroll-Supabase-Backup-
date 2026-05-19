import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { ApiResponse } from '../dto/api-response.dto';

/**
 * Wraps every successful controller return value in the canonical
 * { success: true, data, meta? } envelope.
 *
 * Controllers may return a value directly OR an object shaped like
 * { data, meta } to attach pagination/meta — both are handled.
 */
@Injectable()
export class ResponseInterceptor<T = unknown> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'data' in payload &&
          // distinguish from a raw data object that happens to have a `data` key
          Object.keys(payload as object).every((k) => k === 'data' || k === 'meta')
        ) {
          const { data, meta } = payload as { data: T; meta?: Record<string, unknown> };
          return { success: true, data, ...(meta ? { meta } : {}) };
        }
        return { success: true, data: payload };
      }),
    );
  }
}
