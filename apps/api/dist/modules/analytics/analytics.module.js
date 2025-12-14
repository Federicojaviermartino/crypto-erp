"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AnalyticsModule", {
    enumerable: true,
    get: function() {
        return AnalyticsModule;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _analyticsservice = require("./analytics.service.js");
const _analyticscontroller = require("./analytics.controller.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AnalyticsModule = class AnalyticsModule {
};
AnalyticsModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _database.PrismaModule
        ],
        controllers: [
            _analyticscontroller.AnalyticsController
        ],
        providers: [
            _analyticsservice.AnalyticsService
        ],
        exports: [
            _analyticsservice.AnalyticsService
        ]
    })
], AnalyticsModule);

//# sourceMappingURL=analytics.module.js.map