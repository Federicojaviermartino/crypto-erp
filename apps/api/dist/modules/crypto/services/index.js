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
    get BlockchainSyncService () {
        return _blockchainsyncservice.BlockchainSyncService;
    },
    get CostBasisService () {
        return _costbasisservice.CostBasisService;
    },
    get CryptoAssetsService () {
        return _cryptoassetsservice.CryptoAssetsService;
    },
    get CryptoTransactionsService () {
        return _cryptotransactionsservice.CryptoTransactionsService;
    },
    get SyncProgress () {
        return _blockchainsyncservice.SyncProgress;
    },
    get SyncResult () {
        return _blockchainsyncservice.SyncResult;
    },
    get TaxReportEntry () {
        return _costbasisservice.TaxReportEntry;
    },
    get WalletWithBalances () {
        return _walletsservice.WalletWithBalances;
    },
    get WalletsService () {
        return _walletsservice.WalletsService;
    }
});
const _cryptoassetsservice = require("./crypto-assets.service.js");
const _costbasisservice = require("./cost-basis.service.js");
const _cryptotransactionsservice = require("./crypto-transactions.service.js");
const _walletsservice = require("./wallets.service.js");
const _blockchainsyncservice = require("./blockchain-sync.service.js");

//# sourceMappingURL=index.js.map