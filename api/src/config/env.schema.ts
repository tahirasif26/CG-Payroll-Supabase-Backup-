import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().default('api'),
  API_VERSION: z.string().default('v1'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  DATABASE_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  // Token TTLs (in minutes / hours)
  PASSWORD_RESET_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(60),
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),
  INVITATION_TTL_DAYS: z.coerce.number().int().positive().default(7),

  // Rate limiting
  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  // Mail. `MAIL_PROVIDER` picks the transport:
  //   - `console` (default): logs every outgoing email; useful in local dev.
  //   - `sendgrid`: requires `SENDGRID_API_KEY` + a verified sender in SendGrid.
  //   - `resend`:   requires `RESEND_API_KEY`   + a verified domain in Resend.
  // Switching providers is a single env change + restart.
  MAIL_PROVIDER: z.enum(['console', 'sendgrid', 'resend']).default('console'),
  MAIL_FROM: z.string().email().default('no-reply@cgpayroll.local'),
  MAIL_FROM_NAME: z.string().default('CG Payroll'),
  SENDGRID_API_KEY: z.string().min(10).optional(),
  RESEND_API_KEY: z.string().min(10).optional(),

  // Logging
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
