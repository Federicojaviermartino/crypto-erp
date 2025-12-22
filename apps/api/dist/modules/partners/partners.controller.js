"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PartnersController", {
    enumerable: true,
    get: function() {
        return PartnersController;
    }
});
const _common = require("@nestjs/common");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard.js");
const _partnersservice = require("./partners.service.js");
const _createpartnerdto = require("./dto/create-partner.dto.js");
const _updatepartnerdto = require("./dto/update-partner.dto.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let PartnersController = class PartnersController {
    /**
   * Create a new partner
   * POST /partners
   *
   * Body:
   * {
   *   "name": "Partner Name",
   *   "legalName": "Partner Legal Name",
   *   "email": "partner@example.com",
   *   "commissionRate": 20,
   *   "revenueShareModel": "PERCENTAGE"
   * }
   */ async createPartner(dto) {
        return this.partnersService.createPartner(dto);
    }
    /**
   * List all partners
   * GET /partners?status=ACTIVE&isActive=true
   */ async listPartners(status, isActive) {
        return this.partnersService.listPartners({
            status,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
        });
    }
    /**
   * Get partner by ID
   * GET /partners/:id
   */ async getPartnerById(partnerId) {
        return this.partnersService.getPartnerById(partnerId);
    }
    /**
   * Update partner
   * PUT /partners/:id
   */ async updatePartner(partnerId, dto) {
        return this.partnersService.updatePartner(partnerId, dto);
    }
    /**
   * Get partner analytics
   * GET /partners/:id/analytics
   */ async getPartnerAnalytics(partnerId) {
        return this.partnersService.getPartnerAnalytics(partnerId);
    }
    /**
   * Assign a company to a partner
   * POST /partners/:id/customers
   *
   * Body:
   * {
   *   "companyId": "uuid"
   * }
   */ async assignCustomerToPartner(partnerId, companyId) {
        if (!companyId) {
            throw new _common.BadRequestException('companyId is required');
        }
        return this.partnersService.assignCustomerToPartner(partnerId, companyId);
    }
    /**
   * Get partner commissions
   * GET /partners/:id/commissions?status=PENDING&startDate=2025-01-01&endDate=2025-12-31
   */ async getPartnerCommissions(partnerId, status, startDate, endDate) {
        return this.partnersService.getPartnerCommissions(partnerId, {
            status,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined
        });
    }
    /**
   * Record a commission
   * POST /partners/:id/commissions
   *
   * Body:
   * {
   *   "companyId": "uuid",
   *   "transactionType": "subscription",
   *   "baseAmount": 100.00,
   *   "commissionRate": 20,
   *   "commissionAmount": 20.00
   * }
   */ async createCommission(partnerId, dto) {
        return this.partnersService.createCommission({
            ...dto,
            partnerId
        });
    }
    /**
   * Create a payout for partner
   * POST /partners/:id/payouts
   *
   * Body:
   * {
   *   "periodStart": "2025-01-01",
   *   "periodEnd": "2025-01-31",
   *   "paymentMethod": "bank_transfer"
   * }
   */ async createPayout(partnerId, periodStart, periodEnd, paymentMethod) {
        if (!periodStart || !periodEnd) {
            throw new _common.BadRequestException('periodStart and periodEnd are required');
        }
        return this.partnersService.createPayout(partnerId, new Date(periodStart), new Date(periodEnd), paymentMethod);
    }
    /**
   * Mark payout as paid
   * PUT /partners/payouts/:payoutId/paid
   *
   * Body:
   * {
   *   "paymentReference": "TXN123456"
   * }
   */ async markPayoutAsPaid(payoutId, paymentReference) {
        return this.partnersService.markPayoutAsPaid(payoutId, paymentReference);
    }
    constructor(partnersService){
        this.partnersService = partnersService;
    }
};
_ts_decorate([
    (0, _common.Post)(),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createpartnerdto.CreatePartnerDto === "undefined" ? Object : _createpartnerdto.CreatePartnerDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PartnersController.prototype, "createPartner", null);
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Query)('status')),
    _ts_param(1, (0, _common.Query)('isActive')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PartnersController.prototype, "listPartners", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PartnersController.prototype, "getPartnerById", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _updatepartnerdto.UpdatePartnerDto === "undefined" ? Object : _updatepartnerdto.UpdatePartnerDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PartnersController.prototype, "updatePartner", null);
_ts_decorate([
    (0, _common.Get)(':id/analytics'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PartnersController.prototype, "getPartnerAnalytics", null);
_ts_decorate([
    (0, _common.Post)(':id/customers'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('companyId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PartnersController.prototype, "assignCustomerToPartner", null);
_ts_decorate([
    (0, _common.Get)(':id/commissions'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Query)('status')),
    _ts_param(2, (0, _common.Query)('startDate')),
    _ts_param(3, (0, _common.Query)('endDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PartnersController.prototype, "getPartnerCommissions", null);
_ts_decorate([
    (0, _common.Post)(':id/commissions'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof Omit === "undefined" ? Object : Omit
    ]),
    _ts_metadata("design:returntype", Promise)
], PartnersController.prototype, "createCommission", null);
_ts_decorate([
    (0, _common.Post)(':id/payouts'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('periodStart')),
    _ts_param(2, (0, _common.Body)('periodEnd')),
    _ts_param(3, (0, _common.Body)('paymentMethod')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PartnersController.prototype, "createPayout", null);
_ts_decorate([
    (0, _common.Put)('payouts/:payoutId/paid'),
    _ts_param(0, (0, _common.Param)('payoutId')),
    _ts_param(1, (0, _common.Body)('paymentReference')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PartnersController.prototype, "markPayoutAsPaid", null);
PartnersController = _ts_decorate([
    (0, _common.Controller)('partners'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _partnersservice.PartnersService === "undefined" ? Object : _partnersservice.PartnersService
    ])
], PartnersController);

//# sourceMappingURL=partners.controller.js.map