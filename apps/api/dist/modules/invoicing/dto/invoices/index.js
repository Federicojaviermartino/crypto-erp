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
    get CreateInvoiceDto () {
        return _createinvoicedto.CreateInvoiceDto;
    },
    get InvoiceDirection () {
        return _queryinvoicesdto.InvoiceDirection;
    },
    get InvoiceLineDto () {
        return _createinvoicedto.InvoiceLineDto;
    },
    get InvoiceStatus () {
        return _queryinvoicesdto.InvoiceStatus;
    },
    get InvoiceType () {
        return _createinvoicedto.InvoiceType;
    },
    get QueryInvoicesDto () {
        return _queryinvoicesdto.QueryInvoicesDto;
    }
});
const _createinvoicedto = require("./create-invoice.dto.js");
const _queryinvoicesdto = require("./query-invoices.dto.js");

//# sourceMappingURL=index.js.map