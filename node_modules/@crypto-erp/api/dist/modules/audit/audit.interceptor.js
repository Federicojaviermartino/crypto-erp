"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuditInterceptor", {
    enumerable: true,
    get: function() {
        return AuditInterceptor;
    }
});
const _common = require("@nestjs/common");
const _core = require("@nestjs/core");
const _operators = require("rxjs/operators");
const _auditservice = require("./audit.service");
const _client = require("@prisma/client");
const _auditabledecorator = require("./decorators/auditable.decorator");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let AuditInterceptor = class AuditInterceptor {
    intercept(context, next) {
        const entity = this.reflector.get(_auditabledecorator.AUDITABLE_KEY, context.getHandler());
        if (!entity) {
            // No @Auditable decorator, skip audit logging
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        const { user, body, method, ip, headers } = request;
        // If no user (unauthenticated request), skip
        if (!user) {
            return next.handle();
        }
        return next.handle().pipe((0, _operators.tap)({
            next: async (result)=>{
                try {
                    const action = this.getActionFromMethod(method);
                    const entityId = this.extractEntityId(result, body, request);
                    if (action && entityId) {
                        await this.audit.log({
                            userId: user.id,
                            companyId: request.companyId || user.defaultCompanyId,
                            action,
                            entity,
                            entityId,
                            changes: this.getChanges(method, body, result),
                            metadata: {
                                ip,
                                userAgent: headers['user-agent'],
                                method,
                                path: request.url
                            }
                        });
                    }
                } catch (error) {
                    this.logger.error('Failed to create audit log:', error);
                // Don't throw - audit should not break the main flow
                }
            },
            error: (error)=>{
                // Could log failed operations here if needed
                this.logger.warn(`Operation failed, not logging audit: ${error.message}`);
            }
        }));
    }
    /**
   * Map HTTP method to audit action
   */ getActionFromMethod(method) {
        const mapping = {
            POST: _client.AuditAction.CREATE,
            PATCH: _client.AuditAction.UPDATE,
            PUT: _client.AuditAction.UPDATE,
            DELETE: _client.AuditAction.DELETE,
            GET: _client.AuditAction.VIEW
        };
        return mapping[method] || null;
    }
    /**
   * Extract entity ID from response or request
   */ extractEntityId(result, body, request) {
        // Try to get ID from response
        if (result?.id) {
            return result.id;
        }
        // Try to get ID from request body
        if (body?.id) {
            return body.id;
        }
        // Try to get ID from URL params
        if (request.params?.id) {
            return request.params.id;
        }
        return null;
    }
    /**
   * Get changes for UPDATE operations
   */ getChanges(method, body, result) {
        if (method === 'PATCH' || method === 'PUT') {
            return {
                updated: body
            };
        }
        if (method === 'DELETE') {
            return {
                deleted: true
            };
        }
        return null;
    }
    constructor(reflector, audit){
        this.reflector = reflector;
        this.audit = audit;
        this.logger = new _common.Logger(AuditInterceptor.name);
    }
};
AuditInterceptor = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _core.Reflector === "undefined" ? Object : _core.Reflector,
        typeof _auditservice.AuditService === "undefined" ? Object : _auditservice.AuditService
    ])
], AuditInterceptor);

//# sourceMappingURL=audit.interceptor.js.map