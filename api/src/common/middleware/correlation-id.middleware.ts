import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const CORRELATION_HEADER = 'x-correlation-id';

/**
 * Reads `X-Correlation-Id` from incoming requests and propagates the value to
 * the response and to a `req.correlationId` field that the pino-http logger
 * picks up via its `genReqId` config. If absent, a fresh UUID is generated.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request & { correlationId?: string }, res: Response, next: NextFunction) {
    const incoming = req.header(CORRELATION_HEADER);
    const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
    req.correlationId = id;
    res.setHeader(CORRELATION_HEADER, id);
    next();
  }
}
