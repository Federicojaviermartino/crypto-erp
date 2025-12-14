"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaModule = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("./prisma.service.js");
let PrismaModule = class PrismaModule {
};
exports.PrismaModule = PrismaModule;
exports.PrismaModule = PrismaModule = tslib_1.__decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [prisma_service_js_1.PrismaService],
        exports: [prisma_service_js_1.PrismaService],
    })
], PrismaModule);
//# sourceMappingURL=prisma.module.js.map