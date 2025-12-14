"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WebhooksModule", {
    enumerable: true,
    get: function() {
        return WebhooksModule;
    }
});
const _common = require("@nestjs/common");
const _bull = require("@nestjs/bull");
const _webhooksservice = require("./webhooks.service");
const _webhookscontroller = require("./webhooks.controller");
const _database = require("../../../../../libs/database/src");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let WebhooksModule = class WebhooksModule {
};
WebhooksModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _database.DatabaseModule,
            _bull.BullModule.registerQueue({
                name: 'webhook-delivery'
            })
        ],
        controllers: [
            _webhookscontroller.WebhooksController
        ],
        providers: [
            _webhooksservice.WebhooksService
        ],
        exports: [
            _webhooksservice.WebhooksService
        ]
    })
], WebhooksModule);

//# sourceMappingURL=webhooks.module.js.map