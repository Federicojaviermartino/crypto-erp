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
    get ContactsService () {
        return _contactsservice.ContactsService;
    },
    get InvoicesService () {
        return _invoicesservice.InvoicesService;
    },
    get SeriesService () {
        return _seriesservice.SeriesService;
    }
});
const _contactsservice = require("./contacts.service.js");
const _invoicesservice = require("./invoices.service.js");
const _seriesservice = require("./series.service.js");

//# sourceMappingURL=index.js.map