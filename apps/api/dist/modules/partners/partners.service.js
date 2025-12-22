"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PartnersService", {
    enumerable: true,
    get: function() {
        return PartnersService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _bcrypt = /*#__PURE__*/ _interop_require_wildcard(require("bcrypt"));
const _crypto = /*#__PURE__*/ _interop_require_wildcard(require("crypto"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let PartnersService = class PartnersService {
    /**
   * Create a new partner
   */ async createPartner(dto) {
        // Check if partner with email already exists
        const existing = await this.prisma.partner.findUnique({
            where: {
                email: dto.email
            }
        });
        if (existing) {
            throw new _common.BadRequestException('Partner with this email already exists');
        }
        // Generate API key for partner
        const apiKey = this.generateApiKey();
        const apiKeyHash = await _bcrypt.hash(apiKey, 10);
        const partner = await this.prisma.partner.create({
            data: {
                ...dto,
                apiKey,
                apiKeyHash,
                status: 'PENDING'
            }
        });
        this.logger.log(`Created new partner: ${partner.name} (${partner.id})`);
        return {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            apiKey,
            status: partner.status,
            commissionRate: partner.commissionRate,
            createdAt: partner.createdAt
        };
    }
    /**
   * List all partners
   */ async listPartners(filters) {
        const partners = await this.prisma.partner.findMany({
            where: {
                ...filters?.status && {
                    status: filters.status
                },
                ...filters?.isActive !== undefined && {
                    isActive: filters.isActive
                }
            },
            include: {
                _count: {
                    select: {
                        customers: true,
                        commissions: true,
                        payouts: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return partners;
    }
    /**
   * Get partner by ID
   */ async getPartnerById(partnerId) {
        const partner = await this.prisma.partner.findUnique({
            where: {
                id: partnerId
            },
            include: {
                customers: {
                    include: {
                        company: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        commissions: true,
                        payouts: true
                    }
                }
            }
        });
        if (!partner) {
            throw new _common.NotFoundException(`Partner not found: ${partnerId}`);
        }
        return partner;
    }
    /**
   * Update partner
   */ async updatePartner(partnerId, dto) {
        const partner = await this.prisma.partner.update({
            where: {
                id: partnerId
            },
            data: dto
        });
        this.logger.log(`Updated partner: ${partner.name} (${partnerId})`);
        return partner;
    }
    /**
   * Assign a company to a partner
   */ async assignCustomerToPartner(partnerId, companyId) {
        // Check if partner exists
        const partner = await this.prisma.partner.findUnique({
            where: {
                id: partnerId
            }
        });
        if (!partner) {
            throw new _common.NotFoundException(`Partner not found: ${partnerId}`);
        }
        if (partner.status !== 'ACTIVE') {
            throw new _common.BadRequestException('Partner is not active');
        }
        // Check if company already assigned to another partner
        const existing = await this.prisma.partnerCustomer.findUnique({
            where: {
                companyId
            }
        });
        if (existing) {
            throw new _common.BadRequestException('Company is already assigned to a partner');
        }
        const partnerCustomer = await this.prisma.partnerCustomer.create({
            data: {
                partnerId,
                companyId,
                status: 'ACTIVE',
                activatedAt: new Date()
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        this.logger.log(`Assigned company ${companyId} to partner ${partnerId}`);
        return partnerCustomer;
    }
    /**
   * Record a commission for a partner
   */ async createCommission(dto) {
        const commission = await this.prisma.partnerCommission.create({
            data: {
                partnerId: dto.partnerId,
                companyId: dto.companyId,
                transactionType: dto.transactionType,
                transactionId: dto.transactionId,
                baseAmount: dto.baseAmount,
                commissionRate: dto.commissionRate,
                commissionAmount: dto.commissionAmount,
                currency: dto.currency || 'EUR',
                status: dto.status || 'PENDING',
                periodStart: new Date(),
                periodEnd: new Date()
            }
        });
        this.logger.log(`Created commission ${commission.id} for partner ${dto.partnerId}: €${dto.commissionAmount}`);
        return commission;
    }
    /**
   * Calculate commission for a transaction
   */ async calculateCommission(companyId, transactionType, baseAmount) {
        // Check if company has a partner
        const partnerCustomer = await this.prisma.partnerCustomer.findUnique({
            where: {
                companyId
            },
            include: {
                partner: true
            }
        });
        if (!partnerCustomer || partnerCustomer.status !== 'ACTIVE') {
            return {
                shouldCreateCommission: false
            };
        }
        const partner = partnerCustomer.partner;
        if (partner.status !== 'ACTIVE' || !partner.isActive) {
            return {
                shouldCreateCommission: false
            };
        }
        // Use custom rate if set, otherwise partner's default
        const commissionRate = partnerCustomer.customCommissionRate || partner.commissionRate;
        const commissionAmount = baseAmount * commissionRate / 100;
        return {
            shouldCreateCommission: true,
            commission: {
                partnerId: partner.id,
                companyId,
                transactionType,
                baseAmount,
                commissionRate,
                commissionAmount,
                currency: 'EUR',
                status: 'PENDING'
            }
        };
    }
    /**
   * Get partner commissions
   */ async getPartnerCommissions(partnerId, filters) {
        const commissions = await this.prisma.partnerCommission.findMany({
            where: {
                partnerId,
                ...filters?.status && {
                    status: filters.status
                },
                ...filters?.startDate && filters?.endDate && {
                    periodStart: {
                        gte: filters.startDate
                    },
                    periodEnd: {
                        lte: filters.endDate
                    }
                }
            },
            include: {
                payout: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        // Calculate total
        const totalCommission = commissions.reduce((sum, c)=>sum + c.commissionAmount, 0);
        const totalPending = commissions.filter((c)=>c.status === 'PENDING').reduce((sum, c)=>sum + c.commissionAmount, 0);
        const totalPaid = commissions.filter((c)=>c.status === 'PAID').reduce((sum, c)=>sum + c.commissionAmount, 0);
        return {
            commissions,
            summary: {
                total: totalCommission,
                pending: totalPending,
                paid: totalPaid,
                count: commissions.length
            }
        };
    }
    /**
   * Create a payout for partner
   */ async createPayout(partnerId, periodStart, periodEnd, paymentMethod) {
        // Get all approved but unpaid commissions
        const commissions = await this.prisma.partnerCommission.findMany({
            where: {
                partnerId,
                status: 'APPROVED',
                payoutId: null,
                periodStart: {
                    gte: periodStart
                },
                periodEnd: {
                    lte: periodEnd
                }
            }
        });
        if (commissions.length === 0) {
            throw new _common.BadRequestException('No approved commissions found for this period');
        }
        const totalAmount = commissions.reduce((sum, c)=>sum + c.commissionAmount, 0);
        // Create payout
        const payout = await this.prisma.partnerPayout.create({
            data: {
                partnerId,
                amount: totalAmount,
                currency: 'EUR',
                periodStart,
                periodEnd,
                paymentMethod,
                status: 'PENDING',
                scheduledAt: new Date()
            }
        });
        // Link commissions to payout
        await this.prisma.partnerCommission.updateMany({
            where: {
                id: {
                    in: commissions.map((c)=>c.id)
                }
            },
            data: {
                payoutId: payout.id
            }
        });
        this.logger.log(`Created payout ${payout.id} for partner ${partnerId}: €${totalAmount} (${commissions.length} commissions)`);
        return payout;
    }
    /**
   * Mark payout as paid
   */ async markPayoutAsPaid(payoutId, paymentReference) {
        const payout = await this.prisma.partnerPayout.update({
            where: {
                id: payoutId
            },
            data: {
                status: 'PAID',
                paidAt: new Date(),
                paymentReference
            }
        });
        // Mark all associated commissions as paid
        await this.prisma.partnerCommission.updateMany({
            where: {
                payoutId
            },
            data: {
                status: 'PAID',
                paidAt: new Date()
            }
        });
        this.logger.log(`Marked payout ${payoutId} as paid`);
        return payout;
    }
    /**
   * Get partner analytics
   */ async getPartnerAnalytics(partnerId) {
        const [partner, customers, commissions, payouts] = await Promise.all([
            this.prisma.partner.findUnique({
                where: {
                    id: partnerId
                }
            }),
            this.prisma.partnerCustomer.count({
                where: {
                    partnerId,
                    status: 'ACTIVE'
                }
            }),
            this.prisma.partnerCommission.aggregate({
                where: {
                    partnerId
                },
                _sum: {
                    commissionAmount: true
                },
                _count: true
            }),
            this.prisma.partnerPayout.aggregate({
                where: {
                    partnerId,
                    status: 'PAID'
                },
                _sum: {
                    amount: true
                },
                _count: true
            })
        ]);
        if (!partner) {
            throw new _common.NotFoundException(`Partner not found: ${partnerId}`);
        }
        return {
            partnerId: partner.id,
            partnerName: partner.name,
            activeCustomers: customers,
            totalCommissions: commissions._sum.commissionAmount || 0,
            commissionCount: commissions._count,
            totalPayouts: payouts._sum.amount || 0,
            payoutCount: payouts._count,
            pendingCommissions: (commissions._sum.commissionAmount || 0) - (payouts._sum.amount || 0)
        };
    }
    /**
   * Helper: Generate API key
   */ generateApiKey() {
        return 'pk_' + _crypto.randomBytes(32).toString('hex');
    }
    constructor(prisma){
        this.prisma = prisma;
        this.logger = new _common.Logger(PartnersService.name);
    }
};
PartnersService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], PartnersService);

//# sourceMappingURL=partners.service.js.map