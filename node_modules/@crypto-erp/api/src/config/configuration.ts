/**
 * Application configuration loaded from environment variables.
 * All values are validated at startup.
 */
export default () => ({
  // Application
  nodeEnv: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['PORT'] || '3000', 10),
  frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:4200',

  // Database
  database: {
    url: process.env['DATABASE_URL'],
  },

  // Redis
  redis: {
    url: process.env['REDIS_URL'] || 'redis://localhost:6379',
  },

  // JWT
  jwt: {
    secret: process.env['JWT_SECRET'] || 'dev-secret-change-in-production',
    refreshSecret:
      process.env['JWT_REFRESH_SECRET'] ||
      'dev-refresh-secret-change-in-production',
    accessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] || '15m',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
  },

  // AI Providers
  ai: {
    anthropicApiKey: process.env['ANTHROPIC_API_KEY'],
    openaiApiKey: process.env['OPENAI_API_KEY'],
    ollamaBaseUrl: process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434',
  },

  // Blockchain
  blockchain: {
    covalentApiKey: process.env['COVALENT_API_KEY'],
    coingeckoApiKey: process.env['COINGECKO_API_KEY'],
  },

  // Verifactu
  verifactu: {
    env: process.env['VERIFACTU_ENV'] || 'test',
    certificatePath: process.env['VERIFACTU_CERTIFICATE_PATH'],
    certificatePassword: process.env['VERIFACTU_CERTIFICATE_PASSWORD'],
    softwareId: process.env['VERIFACTU_SOFTWARE_ID'] || 'CRYPTOERP-001',
    softwareName: process.env['VERIFACTU_SOFTWARE_NAME'] || 'CryptoERP',
    softwareVersion: process.env['VERIFACTU_SOFTWARE_VERSION'] || '1.0.0',
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env['RATE_LIMIT_TTL'] || '60000', 10),
    limit: parseInt(process.env['RATE_LIMIT_MAX'] || '100', 10),
  },

  // Feature Flags
  features: {
    verifactuEnabled:
      process.env['FEATURE_VERIFACTU_ENABLED'] === 'true' || false,
    aiEnabled: process.env['FEATURE_AI_ENABLED'] !== 'false', // Default true
    cryptoEnabled: process.env['FEATURE_CRYPTO_ENABLED'] !== 'false', // Default true
  },
});