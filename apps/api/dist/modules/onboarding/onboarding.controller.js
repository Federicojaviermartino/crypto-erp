"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "OnboardingController", {
    enumerable: true,
    get: function() {
        return OnboardingController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _onboardingservice = require("./onboarding.service.js");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard.js");
const _getuserdecorator = require("../auth/decorators/get-user.decorator.js");
const _client = require("@prisma/client");
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
let OnboardingController = class OnboardingController {
    async getProgress(user) {
        return this.onboarding.getOnboardingProgress(user.id);
    }
    async getSteps(user) {
        return this.onboarding.getOnboardingSteps(user.id);
    }
    async completeStep(user, stepId) {
        return this.onboarding.completeStep(user.id, stepId);
    }
    async skipStep(user, stepId) {
        return this.onboarding.skipStep(user.id, stepId);
    }
    async dismissOnboarding(user) {
        await this.onboarding.dismissOnboarding(user.id);
    }
    async restartOnboarding(user) {
        return this.onboarding.restartOnboarding(user.id);
    }
    async getStats() {
        return this.onboarding.getOnboardingStats();
    }
    constructor(onboarding){
        this.onboarding = onboarding;
    }
};
_ts_decorate([
    (0, _common.Get)('progress'),
    (0, _swagger.ApiOperation)({
        summary: 'Get user onboarding progress',
        description: 'Returns the current onboarding progress for the authenticated user'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Onboarding progress retrieved successfully'
    }),
    _ts_param(0, (0, _getuserdecorator.GetUser)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _client.User === "undefined" ? Object : _client.User
    ]),
    _ts_metadata("design:returntype", Promise)
], OnboardingController.prototype, "getProgress", null);
_ts_decorate([
    (0, _common.Get)('steps'),
    (0, _swagger.ApiOperation)({
        summary: 'Get onboarding steps',
        description: 'Returns all onboarding steps with completion status'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Onboarding steps retrieved successfully'
    }),
    _ts_param(0, (0, _getuserdecorator.GetUser)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _client.User === "undefined" ? Object : _client.User
    ]),
    _ts_metadata("design:returntype", Promise)
], OnboardingController.prototype, "getSteps", null);
_ts_decorate([
    (0, _common.Post)('steps/:stepId/complete'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Mark onboarding step as completed',
        description: 'Marks a specific onboarding step as completed'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Step marked as completed'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Step not found'
    }),
    _ts_param(0, (0, _getuserdecorator.GetUser)()),
    _ts_param(1, (0, _common.Param)('stepId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _client.User === "undefined" ? Object : _client.User,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], OnboardingController.prototype, "completeStep", null);
_ts_decorate([
    (0, _common.Post)('steps/:stepId/skip'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Skip onboarding step',
        description: 'Marks a specific onboarding step as skipped'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Step marked as skipped'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Step not found'
    }),
    _ts_param(0, (0, _getuserdecorator.GetUser)()),
    _ts_param(1, (0, _common.Param)('stepId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _client.User === "undefined" ? Object : _client.User,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], OnboardingController.prototype, "skipStep", null);
_ts_decorate([
    (0, _common.Post)('dismiss'),
    (0, _common.HttpCode)(_common.HttpStatus.NO_CONTENT),
    (0, _swagger.ApiOperation)({
        summary: 'Dismiss onboarding',
        description: 'Permanently dismisses the onboarding flow for the user'
    }),
    (0, _swagger.ApiResponse)({
        status: 204,
        description: 'Onboarding dismissed'
    }),
    _ts_param(0, (0, _getuserdecorator.GetUser)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _client.User === "undefined" ? Object : _client.User
    ]),
    _ts_metadata("design:returntype", Promise)
], OnboardingController.prototype, "dismissOnboarding", null);
_ts_decorate([
    (0, _common.Post)('restart'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Restart onboarding',
        description: 'Resets onboarding progress to start from the beginning'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Onboarding restarted'
    }),
    _ts_param(0, (0, _getuserdecorator.GetUser)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _client.User === "undefined" ? Object : _client.User
    ]),
    _ts_metadata("design:returntype", Promise)
], OnboardingController.prototype, "restartOnboarding", null);
_ts_decorate([
    (0, _common.Get)('stats'),
    (0, _swagger.ApiOperation)({
        summary: 'Get onboarding statistics',
        description: 'Returns aggregated onboarding statistics (admin only)'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Statistics retrieved successfully'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], OnboardingController.prototype, "getStats", null);
OnboardingController = _ts_decorate([
    (0, _swagger.ApiTags)('onboarding'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.Controller)('onboarding'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _onboardingservice.OnboardingService === "undefined" ? Object : _onboardingservice.OnboardingService
    ])
], OnboardingController);

//# sourceMappingURL=onboarding.controller.js.map