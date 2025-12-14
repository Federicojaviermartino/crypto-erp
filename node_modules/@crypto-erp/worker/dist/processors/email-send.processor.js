"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "EmailSendProcessor", {
    enumerable: true,
    get: function() {
        return EmailSendProcessor;
    }
});
const _bullmq = require("@nestjs/bullmq");
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _resend = require("resend");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let EmailSendProcessor = class EmailSendProcessor extends _bullmq.WorkerHost {
    async process(job) {
        const { to, subject, html, from, replyTo, attachments } = job.data;
        if (!this.enabled) {
            this.logger.warn(`Email sending disabled - would have sent to ${Array.isArray(to) ? to.join(', ') : to}: ${subject}`);
            return;
        }
        try {
            const result = await this.resendClient.emails.send({
                from: from || 'Crypto-ERP <noreply@crypto-erp.com>',
                to: Array.isArray(to) ? to : [
                    to
                ],
                subject,
                html,
                replyTo: replyTo,
                attachments: attachments
            });
            this.logger.log(`Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}: ${subject} (ID: ${result.data?.id})`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${Array.isArray(to) ? to.join(', ') : to}: ${subject}`, error.stack);
            throw error; // Let BullMQ retry
        }
    }
    constructor(configService){
        super(), this.configService = configService, this.logger = new _common.Logger(EmailSendProcessor.name), this.resendClient = null;
        const apiKey = this.configService.get('RESEND_API_KEY');
        if (apiKey) {
            this.resendClient = new _resend.Resend(apiKey);
            this.enabled = true;
            this.logger.log('Resend email client initialized');
        } else {
            this.enabled = false;
            this.logger.warn('RESEND_API_KEY not configured - emails will not be sent');
        }
    }
};
EmailSendProcessor = _ts_decorate([
    (0, _bullmq.Processor)('email-send', {
        concurrency: 5
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], EmailSendProcessor);

//# sourceMappingURL=email-send.processor.js.map