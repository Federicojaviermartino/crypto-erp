"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CryptoModule", {
    enumerable: true,
    get: function() {
        return CryptoModule;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _bullmq = require("@nestjs/bullmq");
const _database = require("../../../../../libs/database/src");
const _index = require("./services");
const _index1 = require("./controllers");
const _covalentclient = require("./blockchain/covalent.client.js");
const _transactionparser = require("./blockchain/transaction-parser.js");
const _exchangefactory = require("./exchanges/exchange.factory.js");
const _exchangeaccountsservice = require("./exchanges/exchange-accounts.service.js");
const _exchangeaccountscontroller = require("./exchanges/exchange-accounts.controller.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let CryptoModule = class CryptoModule {
};
CryptoModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _database.PrismaModule,
            _config.ConfigModule,
            _bullmq.BullModule.registerQueue({
                name: 'ai-categorize'
            })
        ],
        controllers: [
            _index1.CryptoAssetsController,
            _index1.CryptoTransactionsController,
            _index1.WalletsController,
            _index1.SyncController,
            _exchangeaccountscontroller.ExchangeAccountsController
        ],
        providers: [
            // Blockchain clients
            _covalentclient.CovalentClient,
            _transactionparser.TransactionParser,
            // Exchange clients
            _exchangefactory.ExchangeFactory,
            _exchangeaccountsservice.ExchangeAccountsService,
            // Services
            _index.CryptoAssetsService,
            _index.CostBasisService,
            _index.CryptoTransactionsService,
            _index.WalletsService,
            _index.BlockchainSyncService
        ],
        exports: [
            _covalentclient.CovalentClient,
            _transactionparser.TransactionParser,
            _exchangefactory.ExchangeFactory,
            _exchangeaccountsservice.ExchangeAccountsService,
            _index.CryptoAssetsService,
            _index.CostBasisService,
            _index.CryptoTransactionsService,
            _index.WalletsService,
            _index.BlockchainSyncService
        ]
    })
], CryptoModule);

//# sourceMappingURL=crypto.module.js.map