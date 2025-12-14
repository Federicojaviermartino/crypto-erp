"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "LocalStrategy", {
    enumerable: true,
    get: function() {
        return LocalStrategy;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _passportlocal = require("passport-local");
const _authservice = require("../auth.service.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let LocalStrategy = class LocalStrategy extends (0, _passport.PassportStrategy)(_passportlocal.Strategy) {
    async validate(email, password) {
        const user = await this.authService.validateUser(email, password);
        if (!user) {
            throw new _common.UnauthorizedException('Invalid email or password');
        }
        return user;
    }
    constructor(authService){
        super({
            usernameField: 'email'
        }), this.authService = authService;
    }
};
LocalStrategy = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authservice.AuthService === "undefined" ? Object : _authservice.AuthService
    ])
], LocalStrategy);

//# sourceMappingURL=local.strategy.js.map