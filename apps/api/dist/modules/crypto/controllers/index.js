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
    get CryptoAssetsController () {
        return _cryptoassetscontroller.CryptoAssetsController;
    },
    get CryptoTransactionsController () {
        return _cryptotransactionscontroller.CryptoTransactionsController;
    },
    get SyncController () {
        return _synccontroller.SyncController;
    },
    get WalletsController () {
        return _walletscontroller.WalletsController;
    }
});
const _cryptoassetscontroller = require("./crypto-assets.controller.js");
const _cryptotransactionscontroller = require("./crypto-transactions.controller.js");
const _walletscontroller = require("./wallets.controller.js");
const _synccontroller = require("./sync.controller.js");

//# sourceMappingURL=index.js.map