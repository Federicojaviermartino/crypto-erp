"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "OnboardingService", {
    enumerable: true,
    get: function() {
        return OnboardingService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("@database/prisma/prisma.service.js");
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
let OnboardingService = class OnboardingService {
    async getOnboardingProgress(userId) {
        let progress = await this.prisma.userOnboarding.findUnique({
            where: {
                userId
            }
        });
        if (!progress) {
            // Create initial onboarding record
            progress = await this.prisma.userOnboarding.create({
                data: {
                    userId,
                    status: _client.UserOnboardingStatus.IN_PROGRESS,
                    currentStep: 1,
                    completedSteps: [],
                    skippedSteps: []
                }
            });
        }
        return {
            userId: progress.userId,
            status: progress.status,
            currentStep: progress.currentStep,
            completedSteps: progress.completedSteps,
            skippedSteps: progress.skippedSteps,
            startedAt: progress.startedAt,
            completedAt: progress.completedAt,
            lastActivityAt: progress.lastActivityAt
        };
    }
    async getOnboardingSteps(userId) {
        const progress = await this.getOnboardingProgress(userId);
        return this.ONBOARDING_STEPS.map((step)=>({
                ...step,
                isCompleted: progress.completedSteps.includes(step.id),
                isSkipped: progress.skippedSteps.includes(step.id)
            }));
    }
    async completeStep(userId, stepId) {
        const progress = await this.getOnboardingProgress(userId);
        // Check if step exists
        const step = this.ONBOARDING_STEPS.find((s)=>s.id === stepId);
        if (!step) {
            throw new _common.NotFoundException(`Onboarding step '${stepId}' not found`);
        }
        // Don't add if already completed
        if (progress.completedSteps.includes(stepId)) {
            return progress;
        }
        // Remove from skipped if it was there
        const skippedSteps = progress.skippedSteps.filter((id)=>id !== stepId);
        // Add to completed
        const completedSteps = [
            ...progress.completedSteps,
            stepId
        ];
        // Calculate progress
        const totalSteps = this.ONBOARDING_STEPS.length;
        const completedCount = completedSteps.length;
        const isFullyCompleted = completedCount >= totalSteps;
        // Update next step
        const nextStep = isFullyCompleted ? totalSteps : Math.max(progress.currentStep, step.order + 1);
        const updated = await this.prisma.userOnboarding.update({
            where: {
                userId
            },
            data: {
                completedSteps,
                skippedSteps,
                currentStep: nextStep,
                status: isFullyCompleted ? _client.UserOnboardingStatus.COMPLETED : _client.UserOnboardingStatus.IN_PROGRESS,
                completedAt: isFullyCompleted ? new Date() : null,
                lastActivityAt: new Date()
            }
        });
        return {
            userId: updated.userId,
            status: updated.status,
            currentStep: updated.currentStep,
            completedSteps: updated.completedSteps,
            skippedSteps: updated.skippedSteps,
            startedAt: updated.startedAt,
            completedAt: updated.completedAt,
            lastActivityAt: updated.lastActivityAt
        };
    }
    async skipStep(userId, stepId) {
        const progress = await this.getOnboardingProgress(userId);
        // Check if step exists
        const step = this.ONBOARDING_STEPS.find((s)=>s.id === stepId);
        if (!step) {
            throw new _common.NotFoundException(`Onboarding step '${stepId}' not found`);
        }
        // Don't add if already skipped or completed
        if (progress.skippedSteps.includes(stepId) || progress.completedSteps.includes(stepId)) {
            return progress;
        }
        // Add to skipped
        const skippedSteps = [
            ...progress.skippedSteps,
            stepId
        ];
        // Update next step
        const nextStep = Math.max(progress.currentStep, step.order + 1);
        const updated = await this.prisma.userOnboarding.update({
            where: {
                userId
            },
            data: {
                skippedSteps,
                currentStep: nextStep,
                lastActivityAt: new Date()
            }
        });
        return {
            userId: updated.userId,
            status: updated.status,
            currentStep: updated.currentStep,
            completedSteps: updated.completedSteps,
            skippedSteps: updated.skippedSteps,
            startedAt: updated.startedAt,
            completedAt: updated.completedAt,
            lastActivityAt: updated.lastActivityAt
        };
    }
    async dismissOnboarding(userId) {
        await this.prisma.userOnboarding.update({
            where: {
                userId
            },
            data: {
                status: _client.UserOnboardingStatus.DISMISSED,
                lastActivityAt: new Date()
            }
        });
    }
    async restartOnboarding(userId) {
        const updated = await this.prisma.userOnboarding.update({
            where: {
                userId
            },
            data: {
                status: _client.UserOnboardingStatus.IN_PROGRESS,
                currentStep: 1,
                completedSteps: [],
                skippedSteps: [],
                completedAt: null,
                lastActivityAt: new Date()
            }
        });
        return {
            userId: updated.userId,
            status: updated.status,
            currentStep: updated.currentStep,
            completedSteps: updated.completedSteps,
            skippedSteps: updated.skippedSteps,
            startedAt: updated.startedAt,
            completedAt: updated.completedAt,
            lastActivityAt: updated.lastActivityAt
        };
    }
    async getOnboardingStats() {
        const [total, inProgress, completed, dismissed] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.userOnboarding.count({
                where: {
                    status: _client.UserOnboardingStatus.IN_PROGRESS
                }
            }),
            this.prisma.userOnboarding.count({
                where: {
                    status: _client.UserOnboardingStatus.COMPLETED
                }
            }),
            this.prisma.userOnboarding.count({
                where: {
                    status: _client.UserOnboardingStatus.DISMISSED
                }
            })
        ]);
        const notStarted = total - (inProgress + completed + dismissed);
        return {
            total,
            inProgress,
            completed,
            dismissed,
            notStarted
        };
    }
    constructor(prisma){
        this.prisma = prisma;
        this.ONBOARDING_STEPS = [
            {
                id: 'complete-profile',
                title: 'Completa tu perfil',
                description: 'Añade tu información personal y configura tu cuenta',
                order: 1,
                path: '/settings/profile',
                action: 'Completar perfil'
            },
            {
                id: 'create-company',
                title: 'Crea tu empresa',
                description: 'Registra tu empresa y configura los datos fiscales',
                order: 2,
                path: '/settings/company',
                action: 'Crear empresa'
            },
            {
                id: 'configure-accounting',
                title: 'Configura el plan contable',
                description: 'Selecciona o personaliza tu plan de cuentas contables',
                order: 3,
                path: '/accounting/chart-of-accounts',
                action: 'Configurar plan'
            },
            {
                id: 'create-first-invoice',
                title: 'Emite tu primera factura',
                description: 'Crea una factura con cumplimiento Verifactu automático',
                order: 4,
                path: '/invoicing/invoices/new',
                action: 'Crear factura'
            },
            {
                id: 'add-crypto-wallet',
                title: 'Añade una wallet crypto',
                description: 'Registra tu primera wallet para tracking de activos',
                order: 5,
                path: '/crypto/wallets/new',
                action: 'Añadir wallet'
            },
            {
                id: 'explore-ai-chat',
                title: 'Prueba el asistente AI',
                description: 'Haz tu primera pregunta al asistente de contabilidad',
                order: 6,
                path: '/ai/chat',
                action: 'Abrir chat'
            }
        ];
    }
};
OnboardingService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], OnboardingService);

//# sourceMappingURL=onboarding.service.js.map