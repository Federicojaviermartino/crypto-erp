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
    get ContactType () {
        return _createcontactdto.ContactType;
    },
    get CreateContactDto () {
        return _createcontactdto.CreateContactDto;
    },
    get QueryContactsDto () {
        return _querycontactsdto.QueryContactsDto;
    }
});
const _createcontactdto = require("./create-contact.dto.js");
const _querycontactsdto = require("./query-contacts.dto.js");

//# sourceMappingURL=index.js.map