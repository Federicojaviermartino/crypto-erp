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
    get AUDITABLE_KEY () {
        return AUDITABLE_KEY;
    },
    get Auditable () {
        return Auditable;
    }
});
const _common = require("@nestjs/common");
const AUDITABLE_KEY = 'audit:entity';
const Auditable = (entity)=>(0, _common.SetMetadata)(AUDITABLE_KEY, entity);

//# sourceMappingURL=auditable.decorator.js.map