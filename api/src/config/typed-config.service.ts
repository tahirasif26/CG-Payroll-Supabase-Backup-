import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Typed wrapper around ConfigService so callers get full intellisense and
 * compile-time errors for missing keys.
 */
@Injectable()
export class TypedConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true }) as Env[K];
  }

  get isProd(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get isDev(): boolean {
    return this.get('NODE_ENV') === 'development';
  }
}
