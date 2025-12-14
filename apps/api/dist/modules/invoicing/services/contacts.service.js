"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ContactsService", {
    enumerable: true,
    get: function() {
        return ContactsService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../../libs/database/src");
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
let ContactsService = class ContactsService {
    async findAll(companyId, query) {
        const where = {
            companyId,
            ...query.type && {
                type: query.type
            },
            ...query.isActive !== undefined && {
                isActive: query.isActive
            },
            ...query.search && {
                OR: [
                    {
                        name: {
                            contains: query.search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        taxId: {
                            contains: query.search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        email: {
                            contains: query.search,
                            mode: 'insensitive'
                        }
                    }
                ]
            }
        };
        const [contacts, total] = await Promise.all([
            this.prisma.contact.findMany({
                where,
                orderBy: {
                    name: 'asc'
                },
                skip: query.skip || 0,
                take: query.take || 50
            }),
            this.prisma.contact.count({
                where
            })
        ]);
        return {
            contacts,
            total
        };
    }
    async findById(companyId, id) {
        const contact = await this.prisma.contact.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!contact) {
            throw new _common.NotFoundException(`Contact with ID ${id} not found`);
        }
        return contact;
    }
    async findByTaxId(companyId, taxId) {
        return this.prisma.contact.findFirst({
            where: {
                companyId,
                taxId
            }
        });
    }
    async create(companyId, dto) {
        // Check for duplicate tax ID if provided
        if (dto.taxId) {
            const existing = await this.findByTaxId(companyId, dto.taxId);
            if (existing) {
                throw new _common.ConflictException(`Contact with tax ID ${dto.taxId} already exists`);
            }
        }
        return this.prisma.contact.create({
            data: {
                name: dto.name,
                taxId: dto.taxId,
                type: dto.type || _client.ContactType.CUSTOMER,
                email: dto.email,
                phone: dto.phone,
                address: dto.address,
                city: dto.city,
                postalCode: dto.postalCode,
                country: dto.country || 'ES',
                notes: dto.notes,
                isActive: dto.isActive ?? true,
                companyId
            }
        });
    }
    async update(companyId, id, dto) {
        await this.findById(companyId, id);
        // Check for duplicate tax ID if being updated
        if (dto.taxId) {
            const existing = await this.prisma.contact.findFirst({
                where: {
                    companyId,
                    taxId: dto.taxId,
                    NOT: {
                        id
                    }
                }
            });
            if (existing) {
                throw new _common.ConflictException(`Contact with tax ID ${dto.taxId} already exists`);
            }
        }
        return this.prisma.contact.update({
            where: {
                id
            },
            data: {
                ...dto.name && {
                    name: dto.name
                },
                ...dto.taxId !== undefined && {
                    taxId: dto.taxId
                },
                ...dto.type && {
                    type: dto.type
                },
                ...dto.email !== undefined && {
                    email: dto.email
                },
                ...dto.phone !== undefined && {
                    phone: dto.phone
                },
                ...dto.address !== undefined && {
                    address: dto.address
                },
                ...dto.city !== undefined && {
                    city: dto.city
                },
                ...dto.postalCode !== undefined && {
                    postalCode: dto.postalCode
                },
                ...dto.country !== undefined && {
                    country: dto.country
                },
                ...dto.notes !== undefined && {
                    notes: dto.notes
                },
                ...dto.isActive !== undefined && {
                    isActive: dto.isActive
                }
            }
        });
    }
    async deactivate(companyId, id) {
        await this.findById(companyId, id);
        return this.prisma.contact.update({
            where: {
                id
            },
            data: {
                isActive: false
            }
        });
    }
    async activate(companyId, id) {
        await this.findById(companyId, id);
        return this.prisma.contact.update({
            where: {
                id
            },
            data: {
                isActive: true
            }
        });
    }
    async delete(companyId, id) {
        await this.findById(companyId, id);
        // Check if contact has invoices
        const invoiceCount = await this.prisma.invoice.count({
            where: {
                contactId: id
            }
        });
        if (invoiceCount > 0) {
            throw new _common.ConflictException(`Cannot delete contact with ${invoiceCount} associated invoices. Deactivate instead.`);
        }
        await this.prisma.contact.delete({
            where: {
                id
            }
        });
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
ContactsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], ContactsService);

//# sourceMappingURL=contacts.service.js.map