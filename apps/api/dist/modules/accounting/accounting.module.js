"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AccountingModule", {
    enumerable: true,
    get: function() {
        return AccountingModule;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _index = require("./services");
const _index1 = require("./controllers");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AccountingModule = class AccountingModule {
};
AccountingModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _database.PrismaModule
        ],
        controllers: [
            _index1.AccountsController,
            _index1.JournalEntriesController,
            _index1.FiscalYearsController,
            _index1.ReportsController
        ],
        providers: [
            _index.AccountsService,
            _index.JournalEntriesService,
            _index.FiscalYearsService,
            _index.ReportsService
        ],
        exports: [
            _index.AccountsService,
            _index.JournalEntriesService,
            _index.FiscalYearsService,
            _index.ReportsService
        ]
    })
], AccountingModule);

//# sourceMappingURL=accounting.module.js.map