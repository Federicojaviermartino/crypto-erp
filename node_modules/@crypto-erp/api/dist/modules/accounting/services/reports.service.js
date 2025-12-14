"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ReportsService", {
    enumerable: true,
    get: function() {
        return ReportsService;
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
let ReportsService = class ReportsService {
    async getTrialBalance(companyId, options = {}) {
        // Get all accounts with posted journal entry lines
        const accounts = await this.prisma.account.findMany({
            where: {
                companyId,
                isActive: true
            },
            orderBy: {
                code: 'asc'
            }
        });
        const balances = [];
        for (const account of accounts){
            const whereClause = {
                accountId: account.id,
                journalEntry: {
                    companyId,
                    status: 'POSTED',
                    ...options.fiscalYearId && {
                        fiscalYearId: options.fiscalYearId
                    },
                    ...options.startDate && {
                        date: {
                            gte: options.startDate
                        }
                    },
                    ...options.endDate && {
                        date: {
                            lte: options.endDate
                        }
                    }
                }
            };
            const result = await this.prisma.journalLine.aggregate({
                where: whereClause,
                _sum: {
                    debit: true,
                    credit: true
                }
            });
            const debit = result._sum.debit?.toNumber() || 0;
            const credit = result._sum.credit?.toNumber() || 0;
            // Only include accounts with activity
            if (debit !== 0 || credit !== 0) {
                const isDebitNormal = [
                    'ASSET',
                    'EXPENSE'
                ].includes(account.type);
                const balance = isDebitNormal ? debit - credit : credit - debit;
                balances.push({
                    accountId: account.id,
                    accountCode: account.code,
                    accountName: account.name,
                    accountType: account.type,
                    debit,
                    credit,
                    balance
                });
            }
        }
        const totalDebits = balances.reduce((sum, b)=>sum + b.debit, 0);
        const totalCredits = balances.reduce((sum, b)=>sum + b.credit, 0);
        return {
            accounts: balances,
            totals: {
                totalDebits,
                totalCredits,
                isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
            },
            generatedAt: new Date(),
            period: {
                startDate: options.startDate || null,
                endDate: options.endDate || null,
                fiscalYearId: options.fiscalYearId || null
            }
        };
    }
    async getBalanceSheet(companyId, asOfDate = new Date()) {
        const accounts = await this.prisma.account.findMany({
            where: {
                companyId,
                isActive: true,
                type: {
                    in: [
                        'ASSET',
                        'LIABILITY',
                        'EQUITY'
                    ]
                }
            },
            orderBy: {
                code: 'asc'
            }
        });
        const balances = [];
        for (const account of accounts){
            const result = await this.prisma.journalLine.aggregate({
                where: {
                    accountId: account.id,
                    journalEntry: {
                        companyId,
                        status: 'POSTED',
                        date: {
                            lte: asOfDate
                        }
                    }
                },
                _sum: {
                    debit: true,
                    credit: true
                }
            });
            const debit = result._sum.debit?.toNumber() || 0;
            const credit = result._sum.credit?.toNumber() || 0;
            if (debit !== 0 || credit !== 0) {
                const isDebitNormal = account.type === 'ASSET';
                const balance = isDebitNormal ? debit - credit : credit - debit;
                balances.push({
                    accountId: account.id,
                    accountCode: account.code,
                    accountName: account.name,
                    accountType: account.type,
                    debit,
                    credit,
                    balance
                });
            }
        }
        // Calculate retained earnings (net income for all time)
        const retainedEarnings = await this.calculateRetainedEarnings(companyId, asOfDate);
        const assets = balances.filter((b)=>b.accountType === 'ASSET');
        const liabilities = balances.filter((b)=>b.accountType === 'LIABILITY');
        const equity = balances.filter((b)=>b.accountType === 'EQUITY');
        // Add retained earnings to equity
        if (retainedEarnings !== 0) {
            equity.push({
                accountId: 'retained-earnings',
                accountCode: '129',
                accountName: 'Retained Earnings (Calculated)',
                accountType: 'EQUITY',
                debit: retainedEarnings < 0 ? Math.abs(retainedEarnings) : 0,
                credit: retainedEarnings > 0 ? retainedEarnings : 0,
                balance: retainedEarnings
            });
        }
        const totalAssets = assets.reduce((sum, b)=>sum + b.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, b)=>sum + b.balance, 0);
        const totalEquity = equity.reduce((sum, b)=>sum + b.balance, 0);
        return {
            assets: {
                accounts: assets,
                total: totalAssets
            },
            liabilities: {
                accounts: liabilities,
                total: totalLiabilities
            },
            equity: {
                accounts: equity,
                total: totalEquity
            },
            totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
            isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
            generatedAt: new Date(),
            asOfDate
        };
    }
    async getIncomeStatement(companyId, startDate, endDate) {
        const accounts = await this.prisma.account.findMany({
            where: {
                companyId,
                isActive: true,
                type: {
                    in: [
                        'INCOME',
                        'EXPENSE'
                    ]
                }
            },
            orderBy: {
                code: 'asc'
            }
        });
        const balances = [];
        for (const account of accounts){
            const result = await this.prisma.journalLine.aggregate({
                where: {
                    accountId: account.id,
                    journalEntry: {
                        companyId,
                        status: 'POSTED',
                        date: {
                            gte: startDate,
                            lte: endDate
                        }
                    }
                },
                _sum: {
                    debit: true,
                    credit: true
                }
            });
            const debit = result._sum.debit?.toNumber() || 0;
            const credit = result._sum.credit?.toNumber() || 0;
            if (debit !== 0 || credit !== 0) {
                // Income accounts: credit increases
                // Expense accounts: debit increases
                const isDebitNormal = account.type === 'EXPENSE';
                const balance = isDebitNormal ? debit - credit : credit - debit;
                balances.push({
                    accountId: account.id,
                    accountCode: account.code,
                    accountName: account.name,
                    accountType: account.type,
                    debit,
                    credit,
                    balance
                });
            }
        }
        const income = balances.filter((b)=>b.accountType === 'INCOME');
        const expenses = balances.filter((b)=>b.accountType === 'EXPENSE');
        const totalIncome = income.reduce((sum, b)=>sum + b.balance, 0);
        const totalExpenses = expenses.reduce((sum, b)=>sum + b.balance, 0);
        return {
            income: {
                accounts: income,
                total: totalIncome
            },
            expenses: {
                accounts: expenses,
                total: totalExpenses
            },
            netIncome: totalIncome - totalExpenses,
            generatedAt: new Date(),
            period: {
                startDate,
                endDate
            }
        };
    }
    async getGeneralLedger(companyId, accountId, options = {}) {
        const account = await this.prisma.account.findFirst({
            where: {
                id: accountId,
                companyId
            }
        });
        if (!account) {
            throw new Error('Account not found');
        }
        // Get opening balance (all entries before start date)
        let openingBalance = 0;
        if (options.startDate) {
            const openingResult = await this.prisma.journalLine.aggregate({
                where: {
                    accountId,
                    journalEntry: {
                        companyId,
                        status: 'POSTED',
                        date: {
                            lt: options.startDate
                        }
                    }
                },
                _sum: {
                    debit: true,
                    credit: true
                }
            });
            const openingDebit = openingResult._sum.debit?.toNumber() || 0;
            const openingCredit = openingResult._sum.credit?.toNumber() || 0;
            const isDebitNormal = [
                'ASSET',
                'EXPENSE'
            ].includes(account.type);
            openingBalance = isDebitNormal ? openingDebit - openingCredit : openingCredit - openingDebit;
        }
        // Get entries for the period
        const lines = await this.prisma.journalLine.findMany({
            where: {
                accountId,
                journalEntry: {
                    companyId,
                    status: 'POSTED',
                    ...options.startDate && {
                        date: {
                            gte: options.startDate
                        }
                    },
                    ...options.endDate && {
                        date: {
                            lte: options.endDate
                        }
                    }
                }
            },
            include: {
                journalEntry: {
                    select: {
                        date: true,
                        number: true,
                        description: true,
                        reference: true
                    }
                }
            },
            orderBy: [
                {
                    journalEntry: {
                        date: 'asc'
                    }
                },
                {
                    journalEntry: {
                        number: 'asc'
                    }
                }
            ]
        });
        const isDebitNormal = [
            'ASSET',
            'EXPENSE'
        ].includes(account.type);
        let runningBalance = openingBalance;
        const entries = lines.map((line)=>{
            const debit = line.debit.toNumber();
            const credit = line.credit.toNumber();
            runningBalance += isDebitNormal ? debit - credit : credit - debit;
            return {
                date: line.journalEntry.date,
                entryNumber: line.journalEntry.number,
                description: line.journalEntry.description,
                reference: line.journalEntry.reference,
                debit,
                credit,
                runningBalance
            };
        });
        const totalDebits = entries.reduce((sum, e)=>sum + e.debit, 0);
        const totalCredits = entries.reduce((sum, e)=>sum + e.credit, 0);
        return {
            account: {
                id: account.id,
                code: account.code,
                name: account.name,
                type: account.type
            },
            entries,
            openingBalance,
            closingBalance: runningBalance,
            totalDebits,
            totalCredits,
            generatedAt: new Date(),
            period: {
                startDate: options.startDate || null,
                endDate: options.endDate || null
            }
        };
    }
    async calculateRetainedEarnings(companyId, asOfDate) {
        // Get all income and expense accounts
        const accounts = await this.prisma.account.findMany({
            where: {
                companyId,
                type: {
                    in: [
                        'INCOME',
                        'EXPENSE'
                    ]
                }
            }
        });
        let totalIncome = 0;
        let totalExpenses = 0;
        for (const account of accounts){
            const result = await this.prisma.journalLine.aggregate({
                where: {
                    accountId: account.id,
                    journalEntry: {
                        companyId,
                        status: 'POSTED',
                        date: {
                            lte: asOfDate
                        }
                    }
                },
                _sum: {
                    debit: true,
                    credit: true
                }
            });
            const debit = result._sum.debit?.toNumber() || 0;
            const credit = result._sum.credit?.toNumber() || 0;
            if (account.type === 'INCOME') {
                totalIncome += credit - debit;
            } else {
                totalExpenses += debit - credit;
            }
        }
        return totalIncome - totalExpenses;
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
ReportsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], ReportsService);

//# sourceMappingURL=reports.service.js.map