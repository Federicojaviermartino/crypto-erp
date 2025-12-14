"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdateCompanyDto", {
    enumerable: true,
    get: function() {
        return UpdateCompanyDto;
    }
});
const _swagger = require("@nestjs/swagger");
const _createcompanydto = require("./create-company.dto.js");
let UpdateCompanyDto = class UpdateCompanyDto extends (0, _swagger.PartialType)((0, _swagger.OmitType)(_createcompanydto.CreateCompanyDto, [
    'taxId'
])) {
};

//# sourceMappingURL=update-company.dto.js.map