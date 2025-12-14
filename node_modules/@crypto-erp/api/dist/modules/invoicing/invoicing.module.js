"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InvoicingModule", {
    enumerable: true,
    get: function() {
        return InvoicingModule;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _index = require("./services");
const _invoicepdfservice = require("./services/invoice-pdf.service.js");
const _index1 = require("./controllers");
const _verifactuservice = require("./verifactu/verifactu.service.js");
const _verifactucontroller = require("./verifactu/verifactu.controller.js");
const _aeatclientservice = require("./verifactu/aeat-client.service.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let InvoicingModule = class InvoicingModule {
};
InvoicingModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _database.PrismaModule
        ],
        controllers: [
            _index1.ContactsController,
            _index1.InvoicesController,
            _index1.SeriesController,
            _verifactucontroller.VerifactuController
        ],
        providers: [
            _index.ContactsService,
            _index.InvoicesService,
            _index.SeriesService,
            _verifactuservice.VerifactuService,
            _aeatclientservice.AEATClientService,
            _invoicepdfservice.InvoicePdfService
        ],
        exports: [
            _index.ContactsService,
            _index.InvoicesService,
            _index.SeriesService,
            _verifactuservice.VerifactuService,
            _aeatclientservice.AEATClientService,
            _invoicepdfservice.InvoicePdfService
        ]
    })
], InvoicingModule);

//# sourceMappingURL=invoicing.module.js.map