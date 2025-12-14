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
    get QUEUE_NAMES () {
        return QUEUE_NAMES;
    },
    get WorkerModule () {
        return WorkerModule;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _bullmq = require("@nestjs/bullmq");
const _schedule = require("@nestjs/schedule");
const _database = require("../../../libs/database/src");
const _blockchainsyncprocessor = require("./processors/blockchain-sync.processor.js");
const _priceupdateprocessor = require("./processors/price-update.processor.js");
const _verifactusendprocessor = require("./processors/verifactu-send.processor.js");
const _journalentryprocessor = require("./processors/journal-entry.processor.js");
const _aicategorizeprocessor = require("./processors/ai-categorize.processor.js");
const _emailsendprocessor = require("./processors/email-send.processor.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
const QUEUE_NAMES = {
    BLOCKCHAIN_SYNC: 'blockchain-sync',
    PRICE_UPDATE: 'price-update',
    VERIFACTU_SEND: 'verifactu-send',
    JOURNAL_ENTRY: 'journal-entry',
    AI_CATEGORIZE: 'ai-categorize',
    EMAIL_SEND: 'email-send'
};
let WorkerModule = class WorkerModule {
};
WorkerModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            // Environment configuration
            _config.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [
                    '.env',
                    '.env.local'
                ]
            }),
            // Schedule module for cron jobs
            _schedule.ScheduleModule.forRoot(),
            // BullMQ configuration with Redis connection
            _bullmq.BullModule.forRootAsync({
                imports: [
                    _config.ConfigModule
                ],
                inject: [
                    _config.ConfigService
                ],
                useFactory: (config)=>({
                        connection: {
                            host: config.get('REDIS_HOST', 'localhost'),
                            port: config.get('REDIS_PORT', 6379),
                            password: config.get('REDIS_PASSWORD', undefined),
                            db: config.get('REDIS_DB', 0)
                        },
                        defaultJobOptions: {
                            removeOnComplete: 100,
                            removeOnFail: 500,
                            attempts: 3,
                            backoff: {
                                type: 'exponential',
                                delay: 2000
                            }
                        }
                    })
            }),
            // Register queues
            _bullmq.BullModule.registerQueue({
                name: QUEUE_NAMES.BLOCKCHAIN_SYNC
            }, {
                name: QUEUE_NAMES.PRICE_UPDATE
            }, {
                name: QUEUE_NAMES.VERIFACTU_SEND
            }, {
                name: QUEUE_NAMES.JOURNAL_ENTRY
            }, {
                name: QUEUE_NAMES.AI_CATEGORIZE
            }, {
                name: QUEUE_NAMES.EMAIL_SEND
            })
        ],
        providers: [
            _database.PrismaService,
            _common.Logger,
            // Processors
            _blockchainsyncprocessor.BlockchainSyncProcessor,
            _priceupdateprocessor.PriceUpdateProcessor,
            _verifactusendprocessor.VerifactuSendProcessor,
            _journalentryprocessor.JournalEntryProcessor,
            _aicategorizeprocessor.AiCategorizeProcessor,
            _emailsendprocessor.EmailSendProcessor
        ]
    })
], WorkerModule);

//# sourceMappingURL=worker.module.js.map