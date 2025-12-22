"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PartnersModule", {
    enumerable: true,
    get: function() {
        return PartnersModule;
    }
});
const _common = require("@nestjs/common");
const _partnerscontroller = require("./partners.controller.js");
const _partnersservice = require("./partners.service.js");
const _database = require("../../../../../libs/database/src");
const _authmodule = require("../auth/auth.module.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let PartnersModule = class PartnersModule {
};
PartnersModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _database.PrismaModule,
            _authmodule.AuthModule
        ],
        controllers: [
            _partnerscontroller.PartnersController
        ],
        providers: [
            _partnersservice.PartnersService
        ],
        exports: [
            _partnersservice.PartnersService
        ]
    })
], PartnersModule);

//# sourceMappingURL=partners.module.js.map