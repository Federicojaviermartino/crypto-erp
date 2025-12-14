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
    get ContactsController () {
        return _contactscontroller.ContactsController;
    },
    get InvoicesController () {
        return _invoicescontroller.InvoicesController;
    },
    get SeriesController () {
        return _seriescontroller.SeriesController;
    }
});
const _contactscontroller = require("./contacts.controller.js");
const _invoicescontroller = require("./invoices.controller.js");
const _seriescontroller = require("./series.controller.js");

//# sourceMappingURL=index.js.map