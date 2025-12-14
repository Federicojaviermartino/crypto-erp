"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InvoicesService", {
    enumerable: true,
    get: function() {
        return InvoicesService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../../libs/database/src");
const _client = require("@prisma/client");
const _verifactuservice = require("../verifactu/verifactu.service.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let InvoicesService = class InvoicesService {
    async findAll(companyId, query) {
        const where = {
            companyId,
            ...query.status && {
                status: query.status
            },
            ...query.direction && {
                direction: query.direction
            },
            ...query.contactId && {
                contactId: query.contactId
            },
            ...query.seriesId && {
                seriesId: query.seriesId
            },
            ...query.startDate && {
                issueDate: {
                    gte: new Date(query.startDate)
                }
            },
            ...query.endDate && {
                issueDate: {
                    lte: new Date(query.endDate)
                }
            },
            ...query.verifactuRegistered !== undefined && {
                verifactuHash: query.verifactuRegistered ? {
                    not: null
                } : null
            },
            ...query.search && {
                OR: [
                    {
                        fullNumber: {
                            contains: query.search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        counterpartyName: {
                            contains: query.search,
                            mode: 'insensitive'
                        }
                    }
                ]
            }
        };
        const [invoices, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                include: {
                    lines: true,
                    contact: {
                        select: {
                            id: true,
                            name: true,
                            taxId: true,
                            email: true
                        }
                    },
                    series: {
                        select: {
                            id: true,
                            prefix: true,
                            name: true
                        }
                    }
                },
                orderBy: [
                    {
                        issueDate: 'desc'
                    },
                    {
                        number: 'desc'
                    }
                ],
                skip: query.skip || 0,
                take: query.take || 50
            }),
            this.prisma.invoice.count({
                where
            })
        ]);
        return {
            invoices: invoices,
            total
        };
    }
    async findById(companyId, id) {
        const invoice = await this.prisma.invoice.findFirst({
            where: {
                id,
                companyId
            },
            include: {
                lines: true,
                contact: {
                    select: {
                        id: true,
                        name: true,
                        taxId: true,
                        email: true
                    }
                },
                series: {
                    select: {
                        id: true,
                        prefix: true,
                        name: true
                    }
                }
            }
        });
        if (!invoice) {
            throw new _common.NotFoundException(`Invoice with ID ${id} not found`);
        }
        return invoice;
    }
    async create(companyId, _userId, dto, direction = 'ISSUED') {
        // Validate contact exists
        const contact = dto.contactId ? await this.prisma.contact.findFirst({
            where: {
                id: dto.contactId,
                companyId
            }
        }) : null;
        if (dto.contactId && !contact) {
            throw new _common.NotFoundException('Contact not found');
        }
        // Get or validate series
        const series = dto.seriesId ? await this.prisma.invoiceSeries.findFirst({
            where: {
                id: dto.seriesId,
                companyId
            }
        }) : await this.prisma.invoiceSeries.findFirst({
            where: {
                companyId,
                isDefault: true
            }
        });
        if (!series) {
            throw new _common.BadRequestException('No invoice series found. Please create one first.');
        }
        // Generate invoice number
        const { number, fullNumber } = await this.generateInvoiceNumber(companyId, series.id);
        // Calculate totals
        const totals = this.calculateTotals(dto.lines);
        // Create invoice with lines
        const invoice = await this.prisma.invoice.create({
            data: {
                number,
                fullNumber,
                type: dto.type || _client.InvoiceType.STANDARD,
                direction,
                issueDate: new Date(dto.date),
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                status: 'DRAFT',
                subtotal: totals.subtotal,
                totalTax: totals.taxAmount,
                total: totals.totalAmount,
                taxableBase: totals.subtotal,
                notes: dto.notes || null,
                counterpartyName: contact?.name || dto.counterpartyName || 'N/A',
                counterpartyTaxId: contact?.taxId || dto.counterpartyTaxId,
                counterpartyAddress: contact?.address || dto.counterpartyAddress,
                counterpartyCity: contact?.city || dto.counterpartyCity,
                counterpartyCountry: contact?.country || dto.counterpartyCountry || 'ES',
                companyId,
                contactId: dto.contactId || null,
                seriesId: series.id,
                lines: {
                    create: dto.lines.map((line, index)=>({
                            lineNumber: index + 1,
                            description: line.description,
                            quantity: line.quantity,
                            unitPrice: line.unitPrice,
                            taxRate: line.vatRate ?? 21,
                            discount: line.discountPercent ?? 0,
                            subtotal: line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100),
                            taxAmount: line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100) * ((line.vatRate || 21) / 100),
                            total: this.calculateLineTotal(line)
                        }))
                }
            },
            include: {
                lines: true,
                contact: {
                    select: {
                        id: true,
                        name: true,
                        taxId: true,
                        email: true
                    }
                },
                series: {
                    select: {
                        id: true,
                        prefix: true,
                        name: true
                    }
                }
            }
        });
        return invoice;
    }
    async update(companyId, id, dto) {
        const existing = await this.findById(companyId, id);
        if (existing.status !== 'DRAFT') {
            throw new _common.ConflictException('Only draft invoices can be modified');
        }
        // Update lines if provided
        if (dto.lines) {
            // Delete existing lines
            await this.prisma.invoiceLine.deleteMany({
                where: {
                    invoiceId: id
                }
            });
            // Calculate new totals
            const totals = this.calculateTotals(dto.lines);
            // Create new lines and update invoice
            await this.prisma.invoice.update({
                where: {
                    id
                },
                data: {
                    subtotal: totals.subtotal,
                    totalTax: totals.taxAmount,
                    total: totals.totalAmount,
                    taxableBase: totals.subtotal,
                    lines: {
                        create: dto.lines.map((line, index)=>({
                                lineNumber: index + 1,
                                description: line.description,
                                quantity: line.quantity,
                                unitPrice: line.unitPrice,
                                taxRate: line.vatRate ?? 21,
                                discount: line.discountPercent ?? 0,
                                subtotal: line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100),
                                taxAmount: line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100) * ((line.vatRate || 21) / 100),
                                total: this.calculateLineTotal(line)
                            }))
                    }
                }
            });
        }
        // Update other fields
        await this.prisma.invoice.update({
            where: {
                id
            },
            data: {
                ...dto.contactId && {
                    contactId: dto.contactId
                },
                ...dto.date && {
                    issueDate: new Date(dto.date)
                },
                ...dto.dueDate && {
                    dueDate: new Date(dto.dueDate)
                },
                ...dto.notes !== undefined && {
                    notes: dto.notes
                }
            }
        });
        return this.findById(companyId, id);
    }
    async issue(companyId, id) {
        const invoice = await this.findById(companyId, id);
        if (invoice.status !== 'DRAFT') {
            throw new _common.ConflictException('Only draft invoices can be issued');
        }
        // For outgoing invoices, register with Verifactu
        if (invoice.direction === 'ISSUED') {
            try {
                const verifactuRecord = await this.verifactuService.generateVerifactuRecord(companyId, id);
                if (!verifactuRecord) {
                    throw new _common.BadRequestException('Verifactu registration failed');
                }
            } catch (error) {
                // Log but don't fail - Verifactu may not be required
                console.warn('Verifactu registration skipped:', error);
            }
        }
        await this.prisma.invoice.update({
            where: {
                id
            },
            data: {
                status: 'ISSUED'
            }
        });
        return this.findById(companyId, id);
    }
    async markAsPaid(companyId, id, paidAt) {
        const invoice = await this.findById(companyId, id);
        if (![
            'ISSUED',
            'SENT'
        ].includes(invoice.status)) {
            throw new _common.ConflictException('Only issued or sent invoices can be marked as paid');
        }
        await this.prisma.invoice.update({
            where: {
                id
            },
            data: {
                status: 'PAID',
                paidAt: paidAt || new Date()
            }
        });
        return this.findById(companyId, id);
    }
    async cancel(companyId, id) {
        const invoice = await this.findById(companyId, id);
        if (invoice.status === 'CANCELLED') {
            throw new _common.ConflictException('Invoice is already cancelled');
        }
        // If invoice was issued and registered with Verifactu, we need to issue a rectificative
        if (invoice.verifactuHash) {
            throw new _common.BadRequestException('Cannot cancel a Verifactu-registered invoice. Create a rectificative invoice instead.');
        }
        await this.prisma.invoice.update({
            where: {
                id
            },
            data: {
                status: 'CANCELLED'
            }
        });
        return this.findById(companyId, id);
    }
    async delete(companyId, id) {
        const invoice = await this.findById(companyId, id);
        if (invoice.status !== 'DRAFT') {
            throw new _common.ConflictException('Only draft invoices can be deleted');
        }
        await this.prisma.$transaction([
            this.prisma.invoiceLine.deleteMany({
                where: {
                    invoiceId: id
                }
            }),
            this.prisma.invoice.delete({
                where: {
                    id
                }
            })
        ]);
    }
    async getVerifactuQR(companyId, id) {
        const invoice = await this.prisma.invoice.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!invoice) {
            throw new _common.NotFoundException('Invoice not found');
        }
        if (!invoice.verifactuQrData) {
            throw new _common.BadRequestException('Invoice is not registered with Verifactu');
        }
        return invoice.verifactuQrData;
    }
    async generateInvoiceNumber(companyId, seriesId) {
        const series = await this.prisma.invoiceSeries.findUnique({
            where: {
                id: seriesId
            }
        });
        if (!series) {
            throw new _common.NotFoundException('Invoice series not found');
        }
        const year = new Date().getFullYear();
        const nextNumber = series.nextNumber;
        // Update the next number
        await this.prisma.invoiceSeries.update({
            where: {
                id: seriesId
            },
            data: {
                nextNumber: nextNumber + 1
            }
        });
        // Format: PREFIX-YEAR-NUMBER (e.g., F-2024-000001)
        const prefix = series.prefix || series.code;
        const fullNumber = `${prefix}-${year}-${String(nextNumber).padStart(series.digitCount, '0')}`;
        return {
            number: nextNumber,
            fullNumber
        };
    }
    calculateTotals(lines) {
        let subtotal = 0;
        let taxAmount = 0;
        for (const line of lines){
            const lineTotal = line.quantity * line.unitPrice;
            const discount = lineTotal * ((line.discountPercent || 0) / 100);
            const lineSubtotal = lineTotal - discount;
            const lineVat = lineSubtotal * ((line.vatRate || 21) / 100);
            subtotal += lineSubtotal;
            taxAmount += lineVat;
        }
        return {
            subtotal,
            taxAmount,
            totalAmount: subtotal + taxAmount
        };
    }
    calculateLineTotal(line) {
        const lineTotal = line.quantity * line.unitPrice;
        const discount = lineTotal * ((line.discountPercent || 0) / 100);
        const lineSubtotal = lineTotal - discount;
        const lineVat = lineSubtotal * ((line.vatRate || 21) / 100);
        return lineSubtotal + lineVat;
    }
    constructor(prisma, verifactuService){
        this.prisma = prisma;
        this.verifactuService = verifactuService;
    }
};
InvoicesService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _verifactuservice.VerifactuService === "undefined" ? Object : _verifactuservice.VerifactuService
    ])
], InvoicesService);

//# sourceMappingURL=invoices.service.js.map