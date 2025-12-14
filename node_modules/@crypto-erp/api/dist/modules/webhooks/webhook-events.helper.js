/**
 * Webhook Event Types
 * All available webhook events in the system
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get WebhookEventType () {
        return WebhookEventType;
    },
    get emitWebhookEvent () {
        return emitWebhookEvent;
    }
});
var WebhookEventType = /*#__PURE__*/ function(WebhookEventType) {
    // Invoice events
    WebhookEventType["INVOICE_CREATED"] = "invoice.created";
    WebhookEventType["INVOICE_UPDATED"] = "invoice.updated";
    WebhookEventType["INVOICE_DELETED"] = "invoice.deleted";
    WebhookEventType["INVOICE_SENT"] = "invoice.sent";
    WebhookEventType["INVOICE_PAID"] = "invoice.paid";
    // Crypto transaction events
    WebhookEventType["CRYPTO_TX_CREATED"] = "crypto_transaction.created";
    WebhookEventType["CRYPTO_TX_UPDATED"] = "crypto_transaction.updated";
    // Wallet events
    WebhookEventType["WALLET_CONNECTED"] = "wallet.connected";
    WebhookEventType["WALLET_SYNCED"] = "wallet.synced";
    // Verifactu events
    WebhookEventType["VERIFACTU_SUBMITTED"] = "verifactu.submitted";
    WebhookEventType["VERIFACTU_CONFIRMED"] = "verifactu.confirmed";
    WebhookEventType["VERIFACTU_FAILED"] = "verifactu.failed";
    // User events
    WebhookEventType["USER_REGISTERED"] = "user.registered";
    WebhookEventType["USER_INVITED"] = "user.invited";
    // Subscription events
    WebhookEventType["SUBSCRIPTION_UPDATED"] = "subscription.updated";
    WebhookEventType["SUBSCRIPTION_CANCELLED"] = "subscription.cancelled";
    // Test event
    WebhookEventType["WEBHOOK_TEST"] = "webhook.test";
    return WebhookEventType;
}({});
async function emitWebhookEvent(webhooksService, companyId, event, entityType, entityId, payload) {
    try {
        await webhooksService.emitEvent(companyId, {
            event,
            entityType,
            entityId,
            payload
        });
    } catch (error) {
        // Log but don't fail if webhook emission fails
        console.error(`Failed to emit webhook event ${event}:`, error.message);
    }
}

//# sourceMappingURL=webhook-events.helper.js.map