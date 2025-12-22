"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WhiteLabelController", {
    enumerable: true,
    get: function() {
        return WhiteLabelController;
    }
});
const _common = require("@nestjs/common");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard.js");
const _whitelabelservice = require("./white-label.service.js");
const _updatewhitelabeldto = require("./dto/update-white-label.dto.js");
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
let WhiteLabelController = class WhiteLabelController {
    getCompanyId(headers) {
        const companyId = headers['x-company-id'];
        if (!companyId) {
            throw new _common.BadRequestException('X-Company-Id header is required');
        }
        return companyId;
    }
    /**
   * Get white-label configuration for current company
   * GET /white-label
   */ async getWhiteLabelConfig(headers) {
        const companyId = this.getCompanyId(headers);
        return this.whiteLabelService.getWhiteLabelConfig(companyId);
    }
    /**
   * Get theme CSS for current company
   * GET /white-label/theme.css
   *
   * Returns CSS with custom color variables
   */ async getThemeCss(headers) {
        const companyId = this.getCompanyId(headers);
        const css = await this.whiteLabelService.getThemeCss(companyId);
        return {
            css,
            contentType: 'text/css'
        };
    }
    /**
   * Get email branding configuration
   * GET /white-label/email-branding
   */ async getEmailBranding(headers) {
        const companyId = this.getCompanyId(headers);
        return this.whiteLabelService.getEmailBranding(companyId);
    }
    /**
   * Check if feature is enabled
   * GET /white-label/features/:feature
   */ async isFeatureEnabled(headers, feature) {
        const companyId = this.getCompanyId(headers);
        const enabled = await this.whiteLabelService.isFeatureEnabled(companyId, feature);
        return {
            feature,
            enabled
        };
    }
    /**
   * Update white-label configuration
   * PUT /white-label
   *
   * Example:
   * {
   *   "brandName": "My Brand",
   *   "primaryColor": "#FF0000",
   *   "logoUrl": "https://cdn.example.com/logo.png",
   *   "customDomain": "app.mybrand.com",
   *   "enabledFeatures": ["invoicing", "crypto"]
   * }
   */ async updateWhiteLabelConfig(headers, dto) {
        const companyId = this.getCompanyId(headers);
        return this.whiteLabelService.updateWhiteLabelConfig(companyId, dto);
    }
    /**
   * Verify custom domain ownership
   * POST /white-label/verify-domain
   *
   * Checks DNS records to verify domain ownership
   */ async verifyCustomDomain(headers) {
        const companyId = this.getCompanyId(headers);
        const verified = await this.whiteLabelService.verifyCustomDomain(companyId);
        return {
            verified,
            message: verified ? 'Domain verified successfully' : 'Domain verification failed'
        };
    }
    /**
   * Reset white-label configuration to defaults
   * DELETE /white-label
   */ async deleteWhiteLabelConfig(headers) {
        const companyId = this.getCompanyId(headers);
        return this.whiteLabelService.deleteWhiteLabelConfig(companyId);
    }
    constructor(whiteLabelService){
        this.whiteLabelService = whiteLabelService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Headers)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], WhiteLabelController.prototype, "getWhiteLabelConfig", null);
_ts_decorate([
    (0, _common.Get)('theme.css'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], WhiteLabelController.prototype, "getThemeCss", null);
_ts_decorate([
    (0, _common.Get)('email-branding'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], WhiteLabelController.prototype, "getEmailBranding", null);
_ts_decorate([
    (0, _common.Get)('features/:feature'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('feature')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], WhiteLabelController.prototype, "isFeatureEnabled", null);
_ts_decorate([
    (0, _common.Put)(),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        typeof _updatewhitelabeldto.UpdateWhiteLabelDto === "undefined" ? Object : _updatewhitelabeldto.UpdateWhiteLabelDto
    ]),
    _ts_metadata("design:returntype", Promise)
], WhiteLabelController.prototype, "updateWhiteLabelConfig", null);
_ts_decorate([
    (0, _common.Post)('verify-domain'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], WhiteLabelController.prototype, "verifyCustomDomain", null);
_ts_decorate([
    (0, _common.Delete)(),
    _ts_param(0, (0, _common.Headers)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], WhiteLabelController.prototype, "deleteWhiteLabelConfig", null);
WhiteLabelController = _ts_decorate([
    (0, _common.Controller)('white-label'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _whitelabelservice.WhiteLabelService === "undefined" ? Object : _whitelabelservice.WhiteLabelService
    ])
], WhiteLabelController);

//# sourceMappingURL=white-label.controller.js.map