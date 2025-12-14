"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InvoicingModule", {
    enumerable: true,
    get: function() {
        return _invoicingmodule.InvoicingModule;
    }
});
const _invoicingmodule = require("./invoicing.module.js");
_export_star(require("./services"), exports);
_export_star(require("./dto"), exports);
function _export_star(from, to) {
    Object.keys(from).forEach(function(k) {
        if (k !== "default" && !Object.prototype.hasOwnProperty.call(to, k)) {
            Object.defineProperty(to, k, {
                enumerable: true,
                get: function() {
                    return from[k];
                }
            });
        }
    });
    return from;
}

//# sourceMappingURL=index.js.map