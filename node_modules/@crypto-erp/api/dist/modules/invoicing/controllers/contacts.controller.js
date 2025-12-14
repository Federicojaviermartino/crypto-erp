"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ContactsController", {
    enumerable: true,
    get: function() {
        return ContactsController;
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
let ContactsController = class ContactsController {
    async findAll(companyId, query) {
        return this.contactsService.findAll(companyId, query);
    }
    async findById(companyId, id) {
        return this.contactsService.findById(companyId, id);
    }
    async create(companyId, dto) {
        return this.contactsService.create(companyId, dto);
    }
    async update(companyId, id, dto) {
        return this.contactsService.update(companyId, id, dto);
    }
    async deactivate(companyId, id) {
        return this.contactsService.deactivate(companyId, id);
    }
    async activate(companyId, id) {
        return this.contactsService.activate(companyId, id);
    }
    async delete(companyId, id) {
        await this.contactsService.delete(companyId, id);
    }
    constructor(contactsService){
        this.contactsService = contactsService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List all contacts (customers/suppliers)'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns paginated list of contacts'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _index3.QueryContactsDto === "undefined" ? Object : _index3.QueryContactsDto
    ]),
    _ts_metadata("design:returntype", Promise)
], ContactsController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get contact by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Contact ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns contact details'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Contact not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ContactsController.prototype, "findById", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new contact'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Contact created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Contact with tax ID already exists'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _index3.CreateContactDto === "undefined" ? Object : _index3.CreateContactDto
    ]),
    _ts_metadata("design:returntype", Promise)
], ContactsController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a contact'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Contact ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Contact updated successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Contact not found'
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
], ContactsController.prototype, "update", null);
_ts_decorate([
    (0, _common.Patch)(':id/deactivate'),
    (0, _swagger.ApiOperation)({
        summary: 'Deactivate a contact'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Contact ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Contact deactivated'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ContactsController.prototype, "deactivate", null);
_ts_decorate([
    (0, _common.Patch)(':id/activate'),
    (0, _swagger.ApiOperation)({
        summary: 'Activate a contact'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Contact ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Contact activated'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ContactsController.prototype, "activate", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a contact'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Contact ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 204,
        description: 'Contact deleted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Cannot delete contact with invoices'
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
], ContactsController.prototype, "delete", null);
ContactsController = _ts_decorate([
    (0, _swagger.ApiTags)('Contacts'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard, _index.TenantGuard),
    (0, _common.Controller)('contacts'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index2.ContactsService === "undefined" ? Object : _index2.ContactsService
    ])
], ContactsController);

//# sourceMappingURL=contacts.controller.js.map