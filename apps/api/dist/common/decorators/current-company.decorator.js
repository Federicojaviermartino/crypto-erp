"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CurrentCompany", {
    enumerable: true,
    get: function() {
        return CurrentCompany;
    }
});
const _common = require("@nestjs/common");
const CurrentCompany = (0, _common.createParamDecorator)((data, ctx)=>{
    const request = ctx.switchToHttp().getRequest();
    const companyContext = request.companyContext;
    if (!companyContext) {
        return null;
    }
    switch(data){
        case 'company':
            return companyContext.company;
        case 'role':
            return companyContext.role;
        case 'companyId':
            return companyContext.company.id;
        default:
            return companyContext;
    }
});

//# sourceMappingURL=current-company.decorator.js.map