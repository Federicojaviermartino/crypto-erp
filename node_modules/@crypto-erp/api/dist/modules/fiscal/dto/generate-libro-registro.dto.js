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
    get ExportFormat () {
        return ExportFormat;
    },
    get GenerateLibroRegistroDto () {
        return GenerateLibroRegistroDto;
    },
    get LibroRegistroType () {
        return LibroRegistroType;
    }
});
const _classvalidator = require("class-validator");
const _swagger = require("@nestjs/swagger");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
var LibroRegistroType = /*#__PURE__*/ function(LibroRegistroType) {
    LibroRegistroType["EMITIDAS"] = "emitidas";
    LibroRegistroType["RECIBIDAS"] = "recibidas";
    LibroRegistroType["AMBAS"] = "ambas";
    return LibroRegistroType;
}({});
var ExportFormat = /*#__PURE__*/ function(ExportFormat) {
    ExportFormat["CSV"] = "csv";
    ExportFormat["EXCEL"] = "excel";
    ExportFormat["JSON"] = "json";
    return ExportFormat;
}({});
let GenerateLibroRegistroDto = class GenerateLibroRegistroDto {
    constructor(){
        this.type = "ambas";
        this.format = "json";
    }
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Start date for the libro registro period (YYYY-MM-DD)',
        example: '2024-01-01'
    }),
    (0, _classvalidator.IsDateString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], GenerateLibroRegistroDto.prototype, "startDate", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'End date for the libro registro period (YYYY-MM-DD)',
        example: '2024-12-31'
    }),
    (0, _classvalidator.IsDateString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], GenerateLibroRegistroDto.prototype, "endDate", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Type of invoices to include',
        enum: LibroRegistroType,
        default: "ambas",
        required: false
    }),
    (0, _classvalidator.IsEnum)(LibroRegistroType),
    (0, _classvalidator.IsOptional)(),
    _ts_metadata("design:type", String)
], GenerateLibroRegistroDto.prototype, "type", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Export format',
        enum: ExportFormat,
        default: "json",
        required: false
    }),
    (0, _classvalidator.IsEnum)(ExportFormat),
    (0, _classvalidator.IsOptional)(),
    _ts_metadata("design:type", String)
], GenerateLibroRegistroDto.prototype, "format", void 0);

//# sourceMappingURL=generate-libro-registro.dto.js.map