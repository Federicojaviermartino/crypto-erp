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
    get LoginDto () {
        return _logindto.LoginDto;
    },
    get RefreshTokenDto () {
        return _refreshtokendto.RefreshTokenDto;
    },
    get RegisterDto () {
        return _registerdto.RegisterDto;
    },
    get TokenResponseDto () {
        return _tokenresponsedto.TokenResponseDto;
    }
});
const _registerdto = require("./register.dto.js");
const _logindto = require("./login.dto.js");
const _tokenresponsedto = require("./token-response.dto.js");
const _refreshtokendto = require("./refresh-token.dto.js");

//# sourceMappingURL=index.js.map