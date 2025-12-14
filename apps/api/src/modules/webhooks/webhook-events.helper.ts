/**
 * Webhook Event Types
 * All available webhook events in the system
 */
export enum WebhookEventType {
  // Invoice events
  INVOICE_CREATED = 'invoice.created',
  INVOICE_UPDATED = 'invoice.updated',
  INVOICE_DELETED = 'invoice.deleted',
  INVOICE_SENT = 'invoice.sent',
  INVOICE_PAID = 'invoice.paid',

  // Crypto transaction events
  CRYPTO_TX_CREATED = 'crypto_transaction.created',
  CRYPTO_TX_UPDATED = 'crypto_transaction.updated',
  
  // Wallet events
  WALLET_CONNECTED = 'wallet.connected',
  WALLET_SYNCED = 'wallet.synced',

  // Verifactu events
  VERIFACTU_SUBMITTED = 'verifactu.submitted',
  VERIFACTU_CONFIRMED = 'verifactu.confirmed',
  VERIFACTU_FAILED = 'verifactu.failed',

  // User events
  USER_REGISTERED = 'user.registered',
  USER_INVITED = 'user.invited',

  // Subscription events
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',

  // Test event
  WEBHOOK_TEST = 'webhook.test',
}

/**
 * Helper to emit webhook events from any service
 * 
 * Usage:
 * constructor(private readonly webhooks: WebhooksService) {}
 * 
 * await emitWebhookEvent(
 *   this.webhooks,
 *   companyId,
 *   WebhookEventType.INVOICE_CREATED,
 *   'Invoice',
 *   invoice.id,
 *   invoice
 * );
 */
export async function emitWebhookEvent(
  webhooksService: any,
  companyId: string,
  event: WebhookEventType,
  entityType: string,
  entityId: string,
  payload: any,
) {
  try {
    await webhooksService.emitEvent(companyId, {
      event,
      entityType,
      entityId,
      payload,
    });
  } catch (error) {
    // Log but don't fail if webhook emission fails
    console.error(`Failed to emit webhook event ${event}:`, error.message);
  }
}
