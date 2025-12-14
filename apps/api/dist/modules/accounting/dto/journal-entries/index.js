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
    get CreateJournalEntryDto () {
        return _createjournalentrydto.CreateJournalEntryDto;
    },
    get JournalLineDto () {
        return _createjournalentrydto.JournalLineDto;
    },
    get QueryJournalEntriesDto () {
        return _queryjournalentriesdto.QueryJournalEntriesDto;
    }
});
const _createjournalentrydto = require("./create-journal-entry.dto.js");
const _queryjournalentriesdto = require("./query-journal-entries.dto.js");

//# sourceMappingURL=index.js.map