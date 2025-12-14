"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FiscalModule", {
    enumerable: true,
    get: function() {
        return FiscalModule;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _modelo721service = require("./modelo721.service.js");
const _modelo721controller = require("./modelo721.controller.js");
const _taxreportservice = require("./tax-report.service.js");
const _taxreportcontroller = require("./tax-report.controller.js");
const _taxpredictionservice = require("./tax-prediction.service.js");
const _modelo347service = require("./modelo347.service.js");
const _siiservice = require("./sii.service.js");
const _libroregistroservice = require("./libro-registro.service.js");
const _fiscalcontroller = require("./fiscal.controller.js");
const _invoicingmodule = require("../invoicing/invoicing.module.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let FiscalModule = class FiscalModule {
};
FiscalModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _database.PrismaModule,
            _invoicingmodule.InvoicingModule
        ],
        controllers: [
            _modelo721controller.Modelo721Controller,
            _taxreportcontroller.TaxReportController,
            _fiscalcontroller.FiscalController
        ],
        providers: [
            _modelo721service.Modelo721Service,
            _taxreportservice.TaxReportService,
            _taxpredictionservice.TaxPredictionService,
            _modelo347service.Modelo347Service,
            _siiservice.SIIService,
            _libroregistroservice.LibroRegistroService
        ],
        exports: [
            _modelo721service.Modelo721Service,
            _taxreportservice.TaxReportService,
            _taxpredictionservice.TaxPredictionService,
            _modelo347service.Modelo347Service,
            _siiservice.SIIService,
            _libroregistroservice.LibroRegistroService
        ]
    })
], FiscalModule);

//# sourceMappingURL=fiscal.module.js.map