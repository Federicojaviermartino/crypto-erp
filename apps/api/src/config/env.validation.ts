import { z } from 'zod';

/**
 * Environment variables schema for validation at startup.
 */
export const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().transform(Number).default('3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:4200'),

  // Database (required)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT (required in production)
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // AI Providers (optional)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),

  // Blockchain (optional)
  COVALENT_API_KEY: z.string().optional(),
  COINGECKO_API_KEY: z.string().optional(),

  // Verifactu (optional)
  VERIFACTU_ENV: z.enum(['test', 'production']).default('test'),
  VERIFACTU_CERTIFICATE_PATH: z.string().optional(),
  VERIFACTU_CERTIFICATE_PASSWORD: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_TTL: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),

  // Feature Flags
  FEATURE_VERIFACTU_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  FEATURE_AI_ENABLED: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  FEATURE_CRYPTO_ENABLED: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables at startup.
 * Throws if validation fails with descriptive error messages.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}