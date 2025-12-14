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
    get CreateCryptoTransactionDto () {
        return _createtransactiondto.CreateCryptoTransactionDto;
    },
    get CryptoTransactionType () {
        return _createtransactiondto.CryptoTransactionType;
    },
    get QueryCryptoTransactionsDto () {
        return _querytransactionsdto.QueryCryptoTransactionsDto;
    }
});
const _createtransactiondto = require("./create-transaction.dto.js");
const _querytransactionsdto = require("./query-transactions.dto.js");

//# sourceMappingURL=index.js.map