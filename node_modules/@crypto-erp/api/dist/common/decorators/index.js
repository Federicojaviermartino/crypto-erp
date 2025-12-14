"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
_export_star(require("./current-user.decorator.js"), exports);
_export_star(require("./current-company.decorator.js"), exports);
_export_star(require("./roles.decorator.js"), exports);
_export_star(require("./public.decorator.js"), exports);
function _export_star(from, to) {
    Object.keys(from).forEach(function(k) {
        if (k !== "default" && !Object.prototype.hasOwnProperty.call(to, k)) {
            Object.defineProperty(to, k, {
                enumerable: true,
                get: function() {
                    return from[k];
                }
            });
        }
    });
    return from;
}

//# sourceMappingURL=index.js.map