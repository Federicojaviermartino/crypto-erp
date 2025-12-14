"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "JournalEntriesService", {
    enumerable: true,
    get: function() {
        return JournalEntriesService;
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
let JournalEntriesService = class JournalEntriesService {
    async findAll(companyId, query) {
        const where = {
            companyId,
            ...query.status && {
                status: query.status
            },
            ...query.fiscalYearId && {
                fiscalYearId: query.fiscalYearId
            },
            ...query.startDate && {
                date: {
                    gte: new Date(query.startDate)
                }
            },
            ...query.endDate && {
                date: {
                    lte: new Date(query.endDate)
                }
            },
            ...query.search && {
                OR: [
                    {
                        description: {
                            contains: query.search,
                            mode: 'insensitive'
                        }
                    }
                ]
            }
        };
        const [entries, total] = await Promise.all([
            this.prisma.journalEntry.findMany({
                where,
                include: {
                    lines: {
                        include: {
                            account: {
                                select: {
                                    id: true,
                                    code: true,
                                    name: true,
                                    type: true
                                }
                            }
                        },
                        orderBy: {
                            lineNumber: 'asc'
                        }
                    }
                },
                orderBy: [
                    {
                        date: 'desc'
                    },
                    {
                        number: 'desc'
                    }
                ],
                skip: query.skip || 0,
                take: query.take || 50
            }),
            this.prisma.journalEntry.count({
                where
            })
        ]);
        return {
            entries: entries,
            total
        };
    }
    async findById(companyId, id) {
        const entry = await this.prisma.journalEntry.findFirst({
            where: {
                id,
                companyId
            },
            include: {
                lines: {
                    include: {
                        account: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                                type: true
                            }
                        }
                    },
                    orderBy: {
                        lineNumber: 'asc'
                    }
                }
            }
        });
        if (!entry) {
            throw new _common.NotFoundException(`Journal entry with ID ${id} not found`);
        }
        return entry;
    }
    async create(companyId, _userId, dto) {
        // Validate that debits equal credits
        const totalDebits = dto.lines.reduce((sum, line)=>sum + (line.debit || 0), 0);
        const totalCredits = dto.lines.reduce((sum, line)=>sum + (line.credit || 0), 0);
        if (Math.abs(totalDebits - totalCredits) > 0.001) {
            throw new _common.BadRequestException(`Debits (${totalDebits}) must equal credits (${totalCredits})`);
        }
        // Validate accounts exist
        const accountCodes = dto.lines.map((line)=>line.accountCode);
        const accounts = await this.prisma.account.findMany({
            where: {
                companyId,
                code: {
                    in: accountCodes
                }
            }
        });
        const accountMap = new Map(accounts.map((a)=>[
                a.code,
                a
            ]));
        for (const code of accountCodes){
            if (!accountMap.has(code)) {
                throw new _common.NotFoundException(`Account with code ${code} not found`);
            }
        }
        // Get or validate fiscal year
        const entryDate = new Date(dto.date);
        const fiscalYear = await this.prisma.fiscalYear.findFirst({
            where: {
                companyId,
                startDate: {
                    lte: entryDate
                },
                endDate: {
                    gte: entryDate
                }
            }
        });
        if (!fiscalYear) {
            throw new _common.BadRequestException('No fiscal year found for the entry date');
        }
        if (fiscalYear.isClosed) {
            throw new _common.BadRequestException('Cannot create entries in a closed fiscal year');
        }
        // Generate entry number
        const entryNumber = await this.generateEntryNumber(companyId, fiscalYear.id);
        const entry = await this.prisma.journalEntry.create({
            data: {
                number: entryNumber,
                date: entryDate,
                description: dto.description,
                reference: dto.reference,
                status: 'DRAFT',
                companyId,
                fiscalYearId: fiscalYear.id,
                lines: {
                    create: dto.lines.map((line, index)=>({
                            lineNumber: index + 1,
                            accountId: accountMap.get(line.accountCode).id,
                            debit: line.debit || 0,
                            credit: line.credit || 0,
                            description: line.description
                        }))
                }
            },
            include: {
                lines: {
                    include: {
                        account: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                                type: true
                            }
                        }
                    },
                    orderBy: {
                        lineNumber: 'asc'
                    }
                }
            }
        });
        return entry;
    }
    async update(companyId, id, dto) {
        const existing = await this.findById(companyId, id);
        if (existing.status === 'POSTED') {
            throw new _common.ConflictException('Cannot modify a posted journal entry');
        }
        if (existing.status === 'REVERSED') {
            throw new _common.ConflictException('Cannot modify a reversed journal entry');
        }
        // If lines are being updated, validate them
        if (dto.lines) {
            const totalDebits = dto.lines.reduce((sum, line)=>sum + (line.debit || 0), 0);
            const totalCredits = dto.lines.reduce((sum, line)=>sum + (line.credit || 0), 0);
            if (Math.abs(totalDebits - totalCredits) > 0.001) {
                throw new _common.BadRequestException(`Debits (${totalDebits}) must equal credits (${totalCredits})`);
            }
            const accountCodes = dto.lines.map((line)=>line.accountCode);
            const accounts = await this.prisma.account.findMany({
                where: {
                    companyId,
                    code: {
                        in: accountCodes
                    }
                }
            });
            const accountMap = new Map(accounts.map((a)=>[
                    a.code,
                    a
                ]));
            for (const code of accountCodes){
                if (!accountMap.has(code)) {
                    throw new _common.NotFoundException(`Account with code ${code} not found`);
                }
            }
            // Delete existing lines and create new ones
            await this.prisma.journalLine.deleteMany({
                where: {
                    journalEntryId: id
                }
            });
            await this.prisma.journalLine.createMany({
                data: dto.lines.map((line, index)=>({
                        journalEntryId: id,
                        lineNumber: index + 1,
                        accountId: accountMap.get(line.accountCode).id,
                        debit: line.debit || 0,
                        credit: line.credit || 0,
                        description: line.description
                    }))
            });
        }
        // Update main entry
        await this.prisma.journalEntry.update({
            where: {
                id
            },
            data: {
                ...dto.date && {
                    date: new Date(dto.date)
                },
                ...dto.description !== undefined && {
                    description: dto.description
                },
                ...dto.reference !== undefined && {
                    reference: dto.reference
                }
            }
        });
        return this.findById(companyId, id);
    }
    async post(companyId, id, userId) {
        const entry = await this.findById(companyId, id);
        if (entry.status === 'POSTED') {
            throw new _common.ConflictException('Journal entry is already posted');
        }
        if (entry.status === 'REVERSED') {
            throw new _common.ConflictException('Cannot post a reversed journal entry');
        }
        await this.prisma.journalEntry.update({
            where: {
                id
            },
            data: {
                status: 'POSTED',
                isPosted: true,
                postedAt: new Date(),
                postedBy: userId
            }
        });
        return this.findById(companyId, id);
    }
    async void(companyId, id, userId) {
        const entry = await this.findById(companyId, id);
        if (entry.status === 'REVERSED') {
            throw new _common.ConflictException('Journal entry is already reversed');
        }
        // Check if fiscal year is closed
        const fiscalYear = await this.prisma.fiscalYear.findUnique({
            where: {
                id: entry.fiscalYearId
            }
        });
        if (fiscalYear?.isClosed) {
            throw new _common.BadRequestException('Cannot void entries in a closed fiscal year');
        }
        // For posted entries, create a reversal entry
        if (entry.status === 'POSTED') {
            const reversalNumber = await this.generateEntryNumber(companyId, entry.fiscalYearId);
            await this.prisma.$transaction([
                this.prisma.journalEntry.update({
                    where: {
                        id
                    },
                    data: {
                        status: 'REVERSED',
                        reversedBy: null
                    }
                }),
                this.prisma.journalEntry.create({
                    data: {
                        number: reversalNumber,
                        date: new Date(),
                        description: `Reversal of #${entry.number}: ${entry.description || ''}`,
                        reference: entry.reference,
                        status: 'POSTED',
                        isPosted: true,
                        isReversal: true,
                        reversalOf: id,
                        companyId,
                        fiscalYearId: entry.fiscalYearId,
                        postedAt: new Date(),
                        postedBy: userId,
                        lines: {
                            create: entry.lines.map((line, index)=>({
                                    lineNumber: index + 1,
                                    accountId: line.accountId,
                                    debit: line.credit,
                                    credit: line.debit,
                                    description: `Reversal: ${line.description || ''}`
                                }))
                        }
                    }
                })
            ]);
        } else {
            // Draft entries can be directly deleted or marked
            await this.prisma.journalEntry.update({
                where: {
                    id
                },
                data: {
                    status: 'REVERSED'
                }
            });
        }
        return this.findById(companyId, id);
    }
    async delete(companyId, id) {
        const entry = await this.findById(companyId, id);
        if (entry.status !== 'DRAFT') {
            throw new _common.ConflictException('Only draft entries can be deleted');
        }
        await this.prisma.$transaction([
            this.prisma.journalLine.deleteMany({
                where: {
                    journalEntryId: id
                }
            }),
            this.prisma.journalEntry.delete({
                where: {
                    id
                }
            })
        ]);
    }
    async generateEntryNumber(companyId, fiscalYearId) {
        const lastEntry = await this.prisma.journalEntry.findFirst({
            where: {
                companyId,
                fiscalYearId
            },
            orderBy: {
                number: 'desc'
            }
        });
        return (lastEntry?.number || 0) + 1;
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
JournalEntriesService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], JournalEntriesService);

//# sourceMappingURL=journal-entries.service.js.map