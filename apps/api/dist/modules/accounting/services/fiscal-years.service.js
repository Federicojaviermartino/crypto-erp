"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FiscalYearsService", {
    enumerable: true,
    get: function() {
        return FiscalYearsService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../../libs/database/src");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let FiscalYearsService = class FiscalYearsService {
    async findAll(companyId) {
        return this.prisma.fiscalYear.findMany({
            where: {
                companyId
            },
            orderBy: {
                startDate: 'desc'
            }
        });
    }
    async findById(companyId, id) {
        const fiscalYear = await this.prisma.fiscalYear.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!fiscalYear) {
            throw new _common.NotFoundException(`Fiscal year with ID ${id} not found`);
        }
        return fiscalYear;
    }
    async findCurrent(companyId) {
        const today = new Date();
        return this.prisma.fiscalYear.findFirst({
            where: {
                companyId,
                startDate: {
                    lte: today
                },
                endDate: {
                    gte: today
                },
                isClosed: false
            }
        });
    }
    async findByDate(companyId, date) {
        return this.prisma.fiscalYear.findFirst({
            where: {
                companyId,
                startDate: {
                    lte: date
                },
                endDate: {
                    gte: date
                }
            }
        });
    }
    async create(companyId, dto) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        // Validate dates
        if (endDate <= startDate) {
            throw new _common.BadRequestException('End date must be after start date');
        }
        // Check for overlapping fiscal years
        const overlapping = await this.prisma.fiscalYear.findFirst({
            where: {
                companyId,
                OR: [
                    {
                        startDate: {
                            lte: startDate
                        },
                        endDate: {
                            gte: startDate
                        }
                    },
                    {
                        startDate: {
                            lte: endDate
                        },
                        endDate: {
                            gte: endDate
                        }
                    },
                    {
                        startDate: {
                            gte: startDate
                        },
                        endDate: {
                            lte: endDate
                        }
                    }
                ]
            }
        });
        if (overlapping) {
            throw new _common.ConflictException(`Fiscal year overlaps with existing fiscal year: ${overlapping.name}`);
        }
        // Check for duplicate name
        const existingName = await this.prisma.fiscalYear.findFirst({
            where: {
                companyId,
                name: dto.name
            }
        });
        if (existingName) {
            throw new _common.ConflictException(`Fiscal year with name ${dto.name} already exists`);
        }
        return this.prisma.fiscalYear.create({
            data: {
                name: dto.name,
                startDate,
                endDate,
                notes: dto.notes ?? null,
                companyId,
                isClosed: false
            }
        });
    }
    async update(companyId, id, dto) {
        const existing = await this.findById(companyId, id);
        if (existing.isClosed) {
            throw new _common.ConflictException('Cannot modify a closed fiscal year');
        }
        const updateData = {};
        if (dto.name) {
            const existingName = await this.prisma.fiscalYear.findFirst({
                where: {
                    companyId,
                    name: dto.name,
                    NOT: {
                        id
                    }
                }
            });
            if (existingName) {
                throw new _common.ConflictException(`Fiscal year with name ${dto.name} already exists`);
            }
            updateData.name = dto.name;
        }
        if (dto.startDate || dto.endDate) {
            const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
            const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;
            if (endDate <= startDate) {
                throw new _common.BadRequestException('End date must be after start date');
            }
            // Check for overlapping fiscal years (excluding current)
            const overlapping = await this.prisma.fiscalYear.findFirst({
                where: {
                    companyId,
                    NOT: {
                        id
                    },
                    OR: [
                        {
                            startDate: {
                                lte: startDate
                            },
                            endDate: {
                                gte: startDate
                            }
                        },
                        {
                            startDate: {
                                lte: endDate
                            },
                            endDate: {
                                gte: endDate
                            }
                        },
                        {
                            startDate: {
                                gte: startDate
                            },
                            endDate: {
                                lte: endDate
                            }
                        }
                    ]
                }
            });
            if (overlapping) {
                throw new _common.ConflictException(`Fiscal year overlaps with existing fiscal year: ${overlapping.name}`);
            }
            if (dto.startDate) updateData.startDate = startDate;
            if (dto.endDate) updateData.endDate = endDate;
        }
        if (dto.notes !== undefined) {
            updateData.notes = dto.notes;
        }
        return this.prisma.fiscalYear.update({
            where: {
                id
            },
            data: updateData
        });
    }
    async close(companyId, id) {
        const fiscalYear = await this.findById(companyId, id);
        if (fiscalYear.isClosed) {
            throw new _common.ConflictException('Fiscal year is already closed');
        }
        // Check for draft journal entries
        const draftEntries = await this.prisma.journalEntry.count({
            where: {
                companyId,
                fiscalYearId: id,
                status: 'DRAFT'
            }
        });
        if (draftEntries > 0) {
            throw new _common.BadRequestException(`Cannot close fiscal year with ${draftEntries} draft journal entries. Post or void them first.`);
        }
        return this.prisma.fiscalYear.update({
            where: {
                id
            },
            data: {
                isClosed: true,
                closedAt: new Date()
            }
        });
    }
    async reopen(companyId, id) {
        const fiscalYear = await this.findById(companyId, id);
        if (!fiscalYear.isClosed) {
            throw new _common.ConflictException('Fiscal year is not closed');
        }
        return this.prisma.fiscalYear.update({
            where: {
                id
            },
            data: {
                isClosed: false,
                closedAt: null
            }
        });
    }
    async delete(companyId, id) {
        await this.findById(companyId, id);
        // Check for journal entries
        const entriesCount = await this.prisma.journalEntry.count({
            where: {
                companyId,
                fiscalYearId: id
            }
        });
        if (entriesCount > 0) {
            throw new _common.ConflictException(`Cannot delete fiscal year with ${entriesCount} journal entries`);
        }
        await this.prisma.fiscalYear.delete({
            where: {
                id
            }
        });
    }
    async getStats(companyId, id) {
        await this.findById(companyId, id);
        const [entryCounts, totals] = await Promise.all([
            this.prisma.journalEntry.groupBy({
                by: [
                    'status'
                ],
                where: {
                    companyId,
                    fiscalYearId: id
                },
                _count: true
            }),
            this.prisma.journalLine.aggregate({
                where: {
                    journalEntry: {
                        companyId,
                        fiscalYearId: id,
                        status: 'POSTED'
                    }
                },
                _sum: {
                    debit: true,
                    credit: true
                }
            })
        ]);
        const statusCounts = Object.fromEntries(entryCounts.map((e)=>[
                e.status,
                e._count
            ]));
        return {
            totalEntries: Object.values(statusCounts).reduce((a, b)=>a + b, 0),
            postedEntries: statusCounts['POSTED'] || 0,
            draftEntries: statusCounts['DRAFT'] || 0,
            voidedEntries: statusCounts['REVERSED'] || 0,
            totalDebits: totals._sum.debit?.toNumber() || 0,
            totalCredits: totals._sum.credit?.toNumber() || 0
        };
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
FiscalYearsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], FiscalYearsService);

//# sourceMappingURL=fiscal-years.service.js.map