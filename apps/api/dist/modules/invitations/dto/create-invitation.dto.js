"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateInvitationDto", {
    enumerable: true,
    get: function() {
        return CreateInvitationDto;
    }
});
const _classvalidator = require("class-validator");
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
let CreateInvitationDto = class CreateInvitationDto {
};
_ts_decorate([
    (0, _classvalidator.IsEmail)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], CreateInvitationDto.prototype, "email", void 0);
_ts_decorate([
    (0, _classvalidator.IsEnum)(_client.UserRole),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", typeof _client.UserRole === "undefined" ? Object : _client.UserRole)
], CreateInvitationDto.prototype, "role", void 0);

//# sourceMappingURL=create-invitation.dto.js.map