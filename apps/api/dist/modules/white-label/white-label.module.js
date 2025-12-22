"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WhiteLabelModule", {
    enumerable: true,
    get: function() {
        return WhiteLabelModule;
    }
});
const _common = require("@nestjs/common");
const _whitelabelcontroller = require("./white-label.controller.js");
const _whitelabelservice = require("./white-label.service.js");
const _database = require("../../../../../libs/database/src");
const _authmodule = require("../auth/auth.module.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let WhiteLabelModule = class WhiteLabelModule {
};
WhiteLabelModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _database.PrismaModule,
            _authmodule.AuthModule
        ],
        controllers: [
            _whitelabelcontroller.WhiteLabelController
        ],
        providers: [
            _whitelabelservice.WhiteLabelService
        ],
        exports: [
            _whitelabelservice.WhiteLabelService
        ]
    })
], WhiteLabelModule);

//# sourceMappingURL=white-label.module.js.map