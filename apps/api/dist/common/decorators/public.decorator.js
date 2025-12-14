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
    get IS_PUBLIC_KEY () {
        return IS_PUBLIC_KEY;
    },
    get Public () {
        return Public;
    }
});
const _common = require("@nestjs/common");
const IS_PUBLIC_KEY = 'isPublic';
const Public = ()=>(0, _common.SetMetadata)(IS_PUBLIC_KEY, true);

//# sourceMappingURL=public.decorator.js.map