"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UsersController", {
    enumerable: true,
    get: function() {
        return UsersController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _usersservice = require("./users.service.js");
const _index = require("./dto");
const _jwtauthguard = require("../../common/guards/jwt-auth.guard.js");
const _index1 = require("../../common");
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
let UsersController = class UsersController {
    async getMe(user) {
        return this.usersService.findById(user.sub);
    }
    async updateMe(user, dto) {
        return this.usersService.update(user.sub, dto);
    }
    constructor(usersService){
        this.usersService = usersService;
    }
};
_ts_decorate([
    (0, _common.Get)('me'),
    (0, _swagger.ApiOperation)({
        summary: 'Get current user profile'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'User profile'
    }),
    _ts_param(0, (0, _index1.CurrentUser)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.JwtPayload === "undefined" ? Object : _index1.JwtPayload
    ]),
    _ts_metadata("design:returntype", Promise)
], UsersController.prototype, "getMe", null);
_ts_decorate([
    (0, _common.Patch)('me'),
    (0, _swagger.ApiOperation)({
        summary: 'Update current user profile'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Updated user profile'
    }),
    _ts_param(0, (0, _index1.CurrentUser)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.JwtPayload === "undefined" ? Object : _index1.JwtPayload,
        typeof _index.UpdateUserDto === "undefined" ? Object : _index.UpdateUserDto
    ]),
    _ts_metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
UsersController = _ts_decorate([
    (0, _swagger.ApiTags)('users'),
    (0, _swagger.ApiBearerAuth)('access-token'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('users'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _usersservice.UsersService === "undefined" ? Object : _usersservice.UsersService
    ])
], UsersController);

//# sourceMappingURL=users.controller.js.map