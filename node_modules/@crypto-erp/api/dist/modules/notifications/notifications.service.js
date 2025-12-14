"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "NotificationsService", {
    enumerable: true,
    get: function() {
        return NotificationsService;
    }
});
const _common = require("@nestjs/common");
const _bullmq = require("@nestjs/bullmq");
const _bullmq1 = require("bullmq");
const _config = require("@nestjs/config");
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
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
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let NotificationsService = class NotificationsService {
    /**
   * Send welcome email to new user
   */ async sendWelcomeEmail(user) {
        const html = this.renderTemplate('welcome', {
            firstName: user.firstName,
            loginUrl: `${this.webUrl}/auth/login`
        });
        await this.queueEmail({
            to: user.email,
            subject: 'Bienvenido a Crypto-ERP',
            html
        });
        this.logger.log(`Welcome email queued for ${user.email}`);
    }
    /**
   * Send password reset email
   */ async sendPasswordResetEmail(user, resetToken) {
        const html = this.renderTemplate('password-reset', {
            firstName: user.firstName,
            resetUrl: `${this.webUrl}/auth/reset-password?token=${resetToken}`,
            expiresIn: '1 hora'
        });
        await this.queueEmail({
            to: user.email,
            subject: 'Restablecer contraseña - Crypto-ERP',
            html
        });
        this.logger.log(`Password reset email queued for ${user.email}`);
    }
    /**
   * Send team invitation email
   */ async sendTeamInvitation(invitation) {
        const html = this.renderTemplate('team-invitation', {
            companyName: invitation.company.name,
            inviterName: invitation.inviter.firstName,
            role: this.getRoleDisplayName(invitation.role),
            acceptUrl: `${this.webUrl}/invitations/${invitation.token}`
        });
        await this.queueEmail({
            to: invitation.email,
            subject: `Invitación a ${invitation.company.name} - Crypto-ERP`,
            html
        });
        this.logger.log(`Team invitation email queued for ${invitation.email}`);
    }
    /**
   * Send invoice notification (for future use)
   */ async sendInvoiceNotification(recipientEmail, invoiceNumber, pdfUrl) {
        // Placeholder for future invoice email template
        const html = `
      <html>
        <body>
          <h1>Nueva Factura</h1>
          <p>Has recibido la factura ${invoiceNumber}</p>
          ${pdfUrl ? `<a href="${pdfUrl}">Descargar PDF</a>` : ''}
        </body>
      </html>
    `;
        await this.queueEmail({
            to: recipientEmail,
            subject: `Factura ${invoiceNumber}`,
            html
        });
        this.logger.log(`Invoice notification queued for ${recipientEmail}`);
    }
    /**
   * Queue email for async processing
   */ async queueEmail(emailData) {
        // Set default 'from' if not provided
        if (!emailData.from) {
            emailData.from = this.defaultFrom;
        }
        await this.emailQueue.add('send-email', emailData, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            },
            removeOnComplete: true,
            removeOnFail: false
        });
    }
    /**
   * Render email template with data
   */ renderTemplate(templateName, data) {
        const templatePath = _path.join(__dirname, 'templates', `${templateName}.html`);
        try {
            let html = _fs.readFileSync(templatePath, 'utf-8');
            // Simple template variable replacement
            Object.keys(data).forEach((key)=>{
                const regex = new RegExp(`{{${key}}}`, 'g');
                html = html.replace(regex, String(data[key]));
            });
            return html;
        } catch (error) {
            this.logger.error(`Failed to render template ${templateName}:`, error);
            throw new Error(`Email template ${templateName} not found`);
        }
    }
    /**
   * Get display name for user role
   */ getRoleDisplayName(role) {
        const roleNames = {
            OWNER: 'Propietario',
            ADMIN: 'Administrador',
            ACCOUNTANT: 'Contable',
            USER: 'Usuario',
            VIEWER: 'Visualizador'
        };
        return roleNames[role] || role;
    }
    /**
   * Send custom email (for admin use or testing)
   */ async sendCustomEmail(to, subject, html) {
        await this.queueEmail({
            to,
            subject,
            html
        });
        this.logger.log(`Custom email queued for ${Array.isArray(to) ? to.join(', ') : to}`);
    }
    constructor(emailQueue, configService){
        this.emailQueue = emailQueue;
        this.configService = configService;
        this.logger = new _common.Logger(NotificationsService.name);
        this.defaultFrom = this.configService.get('EMAIL_FROM', 'Crypto-ERP <noreply@crypto-erp.com>');
        this.webUrl = this.configService.get('WEB_URL', 'http://localhost:4200');
    }
};
NotificationsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _bullmq.InjectQueue)('email-send')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _bullmq1.Queue === "undefined" ? Object : _bullmq1.Queue,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], NotificationsService);

//# sourceMappingURL=notifications.service.js.map