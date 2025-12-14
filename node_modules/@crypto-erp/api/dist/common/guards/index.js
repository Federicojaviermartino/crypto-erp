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
    get JwtAuthGuard () {
        return _jwtauthguard.JwtAuthGuard;
    },
    get RolesGuard () {
        return _rolesguard.RolesGuard;
    },
    get TenantGuard () {
        return _tenantguard.TenantGuard;
    }
});
const _jwtauthguard = require("./jwt-auth.guard.js");
const _tenantguard = require("./tenant.guard.js");
const _rolesguard = require("./roles.guard.js");

//# sourceMappingURL=index.js.map