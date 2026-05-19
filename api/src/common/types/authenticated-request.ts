import type { Request } from 'express';
import type { RequestUser } from './jwt-payload';

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
