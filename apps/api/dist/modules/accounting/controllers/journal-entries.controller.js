"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "JournalEntriesController", {
    enumerable: true,
    get: function() {
        return JournalEntriesController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _index = require("../../../common/guards");
const _index1 = require("../../../common/decorators");
const _index2 = require("../services");
const _index3 = require("../dto");
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
let JournalEntriesController = class JournalEntriesController {
    async findAll(companyId, query) {
        return this.journalEntriesService.findAll(companyId, query);
    }
    async findById(companyId, id) {
        return this.journalEntriesService.findById(companyId, id);
    }
    async create(companyId, user, dto) {
        return this.journalEntriesService.create(companyId, user.sub, dto);
    }
    async update(companyId, id, dto) {
        return this.journalEntriesService.update(companyId, id, dto);
    }
    async post(companyId, user, id) {
        return this.journalEntriesService.post(companyId, id, user.sub);
    }
    async void(companyId, user, id) {
        return this.journalEntriesService.void(companyId, id, user.sub);
    }
    async delete(companyId, id) {
        await this.journalEntriesService.delete(companyId, id);
    }
    constructor(journalEntriesService){
        this.journalEntriesService = journalEntriesService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List all journal entries'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns paginated list of journal entries'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _index3.QueryJournalEntriesDto === "undefined" ? Object : _index3.QueryJournalEntriesDto
    ]),
    _ts_metadata("design:returntype", Promise)
], JournalEntriesController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get journal entry by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Journal entry ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns journal entry details with lines'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Journal entry not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], JournalEntriesController.prototype, "findById", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new journal entry'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Journal entry created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Invalid data or unbalanced entry'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _index1.CurrentUser)()),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof JwtPayload === "undefined" ? Object : JwtPayload,
        typeof _index3.CreateJournalEntryDto === "undefined" ? Object : _index3.CreateJournalEntryDto
    ]),
    _ts_metadata("design:returntype", Promise)
], JournalEntriesController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a journal entry'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Journal entry ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Journal entry updated successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Journal entry not found'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Cannot modify posted entry'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], JournalEntriesController.prototype, "update", null);
_ts_decorate([
    (0, _common.Patch)(':id/post'),
    (0, _swagger.ApiOperation)({
        summary: 'Post a journal entry'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Journal entry ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Journal entry posted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Journal entry not found'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Entry already posted or voided'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _index1.CurrentUser)()),
    _ts_param(2, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof JwtPayload === "undefined" ? Object : JwtPayload,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], JournalEntriesController.prototype, "post", null);
_ts_decorate([
    (0, _common.Patch)(':id/void'),
    (0, _swagger.ApiOperation)({
        summary: 'Void a journal entry'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Journal entry ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Journal entry voided successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Journal entry not found'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Entry already voided'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _index1.CurrentUser)()),
    _ts_param(2, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof JwtPayload === "undefined" ? Object : JwtPayload,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], JournalEntriesController.prototype, "void", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a draft journal entry'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Journal entry ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 204,
        description: 'Journal entry deleted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Journal entry not found'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Only draft entries can be deleted'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.NO_CONTENT),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], JournalEntriesController.prototype, "delete", null);
JournalEntriesController = _ts_decorate([
    (0, _swagger.ApiTags)('Journal Entries'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard, _index.TenantGuard),
    (0, _common.Controller)('journal-entries'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index2.JournalEntriesService === "undefined" ? Object : _index2.JournalEntriesService
    ])
], JournalEntriesController);

//# sourceMappingURL=journal-entries.controller.js.map