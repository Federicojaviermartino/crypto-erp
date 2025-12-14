"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SeriesService", {
    enumerable: true,
    get: function() {
        return SeriesService;
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
let SeriesService = class SeriesService {
    async findAll(companyId) {
        return this.prisma.invoiceSeries.findMany({
            where: {
                companyId
            },
            orderBy: {
                prefix: 'asc'
            }
        });
    }
    async findById(companyId, id) {
        const series = await this.prisma.invoiceSeries.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!series) {
            throw new _common.NotFoundException(`Invoice series with ID ${id} not found`);
        }
        return series;
    }
    async findByPrefix(companyId, prefix) {
        return this.prisma.invoiceSeries.findFirst({
            where: {
                companyId,
                prefix
            }
        });
    }
    async create(companyId, dto) {
        // Check for duplicate prefix
        const existing = await this.findByPrefix(companyId, dto.prefix);
        if (existing) {
            throw new _common.ConflictException(`Series with prefix ${dto.prefix} already exists`);
        }
        // If this will be default, unset other defaults
        if (dto.isDefault) {
            await this.prisma.invoiceSeries.updateMany({
                where: {
                    companyId,
                    isDefault: true
                },
                data: {
                    isDefault: false
                }
            });
        }
        return this.prisma.invoiceSeries.create({
            data: {
                code: dto.prefix,
                prefix: dto.prefix,
                name: dto.name,
                type: _client.InvoiceType.STANDARD,
                nextNumber: dto.nextNumber ?? 1,
                digitCount: 6,
                isDefault: dto.isDefault ?? false,
                company: {
                    connect: {
                        id: companyId
                    }
                }
            }
        });
    }
    async update(companyId, id, dto) {
        const existing = await this.findById(companyId, id);
        // Check for duplicate prefix if changing
        if (dto.prefix && dto.prefix !== existing.prefix) {
            const duplicate = await this.findByPrefix(companyId, dto.prefix);
            if (duplicate) {
                throw new _common.ConflictException(`Series with prefix ${dto.prefix} already exists`);
            }
        }
        // If setting as default, unset other defaults
        if (dto.isDefault) {
            await this.prisma.invoiceSeries.updateMany({
                where: {
                    companyId,
                    isDefault: true,
                    NOT: {
                        id
                    }
                },
                data: {
                    isDefault: false
                }
            });
        }
        return this.prisma.invoiceSeries.update({
            where: {
                id
            },
            data: {
                ...dto.prefix && {
                    prefix: dto.prefix,
                    code: dto.prefix
                },
                ...dto.name && {
                    name: dto.name
                },
                ...dto.nextNumber && {
                    nextNumber: dto.nextNumber
                },
                ...dto.isDefault !== undefined && {
                    isDefault: dto.isDefault
                }
            }
        });
    }
    async delete(companyId, id) {
        await this.findById(companyId, id);
        // Check if series has invoices
        const invoiceCount = await this.prisma.invoice.count({
            where: {
                seriesId: id
            }
        });
        if (invoiceCount > 0) {
            throw new _common.ConflictException(`Cannot delete series with ${invoiceCount} associated invoices. Deactivate instead.`);
        }
        await this.prisma.invoiceSeries.delete({
            where: {
                id
            }
        });
    }
    async getStats(companyId, id) {
        await this.findById(companyId, id);
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
        const [totalInvoices, currentYearInvoices, lastInvoice] = await Promise.all([
            this.prisma.invoice.count({
                where: {
                    seriesId: id
                }
            }),
            this.prisma.invoice.count({
                where: {
                    seriesId: id,
                    issueDate: {
                        gte: startOfYear,
                        lte: endOfYear
                    }
                }
            }),
            this.prisma.invoice.findFirst({
                where: {
                    seriesId: id
                },
                orderBy: {
                    number: 'desc'
                },
                select: {
                    fullNumber: true
                }
            })
        ]);
        return {
            totalInvoices,
            currentYear,
            currentYearInvoices,
            lastInvoiceNumber: lastInvoice?.fullNumber || null
        };
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
SeriesService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], SeriesService);

//# sourceMappingURL=series.service.js.map