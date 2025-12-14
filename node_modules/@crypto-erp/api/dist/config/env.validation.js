"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get envSchema () {
        return envSchema;
    },
    get validateEnv () {
        return validateEnv;
    }
});
const _zod = require("zod");
const envSchema = _zod.z.object({
    // Application
    NODE_ENV: _zod.z.enum([
        'development',
        'production',
        'test'
    ]).default('development'),
    PORT: _zod.z.string().transform(Number).default('3000'),
    FRONTEND_URL: _zod.z.string().url().default('http://localhost:4200'),
    // Database (required)
    DATABASE_URL: _zod.z.string().min(1, 'DATABASE_URL is required'),
    // Redis
    REDIS_URL: _zod.z.string().default('redis://localhost:6379'),
    // JWT (required in production)
    JWT_SECRET: _zod.z.string().min(1),
    JWT_REFRESH_SECRET: _zod.z.string().min(1),
    JWT_ACCESS_EXPIRES_IN: _zod.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: _zod.z.string().default('7d'),
    // AI Providers (optional)
    ANTHROPIC_API_KEY: _zod.z.string().optional(),
    OPENAI_API_KEY: _zod.z.string().optional(),
    OLLAMA_BASE_URL: _zod.z.string().default('http://localhost:11434'),
    // Blockchain (optional)
    COVALENT_API_KEY: _zod.z.string().optional(),
    COINGECKO_API_KEY: _zod.z.string().optional(),
    // Verifactu (optional)
    VERIFACTU_ENV: _zod.z.enum([
        'test',
        'production'
    ]).default('test'),
    VERIFACTU_CERTIFICATE_PATH: _zod.z.string().optional(),
    VERIFACTU_CERTIFICATE_PASSWORD: _zod.z.string().optional(),
    // Rate Limiting
    RATE_LIMIT_TTL: _zod.z.string().transform(Number).default('60000'),
    RATE_LIMIT_MAX: _zod.z.string().transform(Number).default('100'),
    // Feature Flags
    FEATURE_VERIFACTU_ENABLED: _zod.z.string().transform((v)=>v === 'true').default('false'),
    FEATURE_AI_ENABLED: _zod.z.string().transform((v)=>v !== 'false').default('true'),
    FEATURE_CRYPTO_ENABLED: _zod.z.string().transform((v)=>v !== 'false').default('true')
});
function validateEnv(config) {
    const result = envSchema.safeParse(config);
    if (!result.success) {
        const errors = result.error.errors.map((e)=>`  - ${e.path.join('.')}: ${e.message}`).join('\n');
        throw new Error(`Environment validation failed:\n${errors}`);
    }
    return result.data;
}

//# sourceMappingURL=env.validation.js.map