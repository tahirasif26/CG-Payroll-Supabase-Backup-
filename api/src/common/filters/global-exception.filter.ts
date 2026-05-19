import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import type { ApiResponse } from '../dto/api-response.dto';

/**
 * Catches all errors thrown from controllers/services and normalizes them into
 * the canonical ApiResponse envelope. Maps known Prisma errors to HTTP codes.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, code, message, fields } = this.normalize(exception);

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl} → ${status} ${code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${req.method} ${req.originalUrl} → ${status} ${code}: ${message}`);
    }

    const body: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        ...(fields ? { fields } : {}),
      },
    };

    res.status(status).json(body);
  }

  private normalize(err: unknown): {
    status: number;
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  } {
    // NestJS HttpException
    if (err instanceof HttpException) {
      const status = err.getStatus();
      const response = err.getResponse();
      if (typeof response === 'string') {
        return { status, code: this.codeFromStatus(status), message: response };
      }
      const obj = response as {
        code?: string;
        message?: string | string[];
        fields?: Record<string, string[]>;
      };
      const message = Array.isArray(obj.message) ? obj.message.join('; ') : obj.message ?? err.message;
      return {
        status,
        code: obj.code ?? this.codeFromStatus(status),
        message,
        fields: obj.fields,
      };
    }

    // Prisma known errors → HTTP mapping
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      switch (err.code) {
        case 'P2002': // unique constraint
          return {
            status: HttpStatus.CONFLICT,
            code: 'UNIQUE_CONSTRAINT_VIOLATION',
            message: 'Resource already exists with the same unique field(s).',
          };
        case 'P2025': // record not found
          return {
            status: HttpStatus.NOT_FOUND,
            code: 'NOT_FOUND',
            message: 'Resource not found.',
          };
        case 'P2003': // FK violation
          return {
            status: HttpStatus.BAD_REQUEST,
            code: 'FOREIGN_KEY_VIOLATION',
            message: 'Referenced resource does not exist.',
          };
        default:
          return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            code: `PRISMA_${err.code}`,
            message: 'Database error.',
          };
      }
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'PRISMA_VALIDATION_ERROR',
        message: 'Invalid query arguments.',
      };
    }

    // Anything else
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Internal server error',
    };
  }

  private codeFromStatus(status: number): string {
    return (
      {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'UNPROCESSABLE_ENTITY',
        429: 'TOO_MANY_REQUESTS',
      }[status] ?? `HTTP_${status}`
    );
  }
}
