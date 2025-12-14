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
    get AccountsController () {
        return _accountscontroller.AccountsController;
    },
    get FiscalYearsController () {
        return _fiscalyearscontroller.FiscalYearsController;
    },
    get JournalEntriesController () {
        return _journalentriescontroller.JournalEntriesController;
    },
    get ReportsController () {
        return _reportscontroller.ReportsController;
    }
});
const _accountscontroller = require("./accounts.controller.js");
const _journalentriescontroller = require("./journal-entries.controller.js");
const _fiscalyearscontroller = require("./fiscal-years.controller.js");
const _reportscontroller = require("./reports.controller.js");

//# sourceMappingURL=index.js.map