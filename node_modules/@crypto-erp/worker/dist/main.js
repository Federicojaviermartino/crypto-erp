"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _core = require("@nestjs/core");
const _common = require("@nestjs/common");
const _workermodule = require("./worker.module.js");
async function bootstrap() {
    const logger = new _common.Logger('Worker');
    const app = await _core.NestFactory.createApplicationContext(_workermodule.WorkerModule, {
        logger: [
            'error',
            'warn',
            'log',
            'debug',
            'verbose'
        ]
    });
    logger.log('='.repeat(60));
    logger.log('🚀 Crypto ERP Worker Started');
    logger.log('='.repeat(60));
    logger.log('');
    logger.log('Active Processors:');
    logger.log('  📦 BlockchainSyncProcessor - Sync wallets every 15 min');
    logger.log('  💰 PriceUpdateProcessor    - Update prices every 5 min');
    logger.log('  📄 VerifactuSendProcessor  - Submit invoices to AEAT');
    logger.log('  📝 JournalEntryProcessor   - Auto-create journal entries');
    logger.log('');
    logger.log('Redis:', process.env.REDIS_HOST || 'localhost');
    logger.log('Environment:', process.env.NODE_ENV || 'development');
    logger.log('='.repeat(60));
    // Enable graceful shutdown
    process.on('SIGTERM', async ()=>{
        logger.log('Received SIGTERM signal. Shutting down gracefully...');
        await app.close();
        process.exit(0);
    });
    process.on('SIGINT', async ()=>{
        logger.log('Received SIGINT signal. Shutting down gracefully...');
        await app.close();
        process.exit(0);
    });
}
bootstrap().catch((error)=>{
    console.error('Failed to start worker:', error);
    process.exit(1);
});

//# sourceMappingURL=main.js.map