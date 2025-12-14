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
    get AccountsService () {
        return _accountsservice.AccountsService;
    },
    get FiscalYearsService () {
        return _fiscalyearsservice.FiscalYearsService;
    },
    get JournalEntriesService () {
        return _journalentriesservice.JournalEntriesService;
    },
    get ReportsService () {
        return _reportsservice.ReportsService;
    }
});
const _accountsservice = require("./accounts.service.js");
const _journalentriesservice = require("./journal-entries.service.js");
const _fiscalyearsservice = require("./fiscal-years.service.js");
const _reportsservice = require("./reports.service.js");

//# sourceMappingURL=index.js.map