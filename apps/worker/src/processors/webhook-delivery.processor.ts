import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '@crypto-erp/database';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';

interface WebhookDeliveryJob {
  deliveryId: string;
  subscriptionId: string;
  url: string;
  secret: string;
  event: string;
  payload: any;
  timeout: number;
}

@Processor('webhook-delivery')
export class WebhookDeliveryProcessor {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('send-webhook')
  async handleWebhookDelivery(job: Job<WebhookDeliveryJob>) {
    const { deliveryId, url, secret, event, payload, timeout } = job.data;

    this.logger.log(`Delivering webhook ${deliveryId} to ${url}`);

    // Update status to SENDING
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'SENDING',
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    try {
      // Generate HMAC signature
      const signature = this.generateSignature(payload, secret);

      // Prepare webhook payload
      const webhookPayload = {
        id: deliveryId,
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      };

      // Send HTTP POST request
      const response = await axios.post(url, webhookPayload, {
        timeout,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event,
          'User-Agent': 'Crypto-ERP-Webhooks/1.0',
        },
        validateStatus: (status) => status >= 200 && status < 300,
      });

      // Success - update delivery record
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DELIVERED',
          responseStatus: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 10000),
          responseHeaders: response.headers as any,
          deliveredAt: new Date(),
        },
      });

      this.logger.log(`Webhook ${deliveryId} delivered successfully`);
    } catch (error) {
      await this.handleDeliveryError(deliveryId, error, job.attemptsMade);
    }
  }

  private async handleDeliveryError(
    deliveryId: string,
    error: any,
    attemptsMade: number,
  ) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) return;

    const isAxiosError = error.isAxiosError;
    const responseStatus = isAxiosError ? error.response?.status : null;
    const errorMessage = isAxiosError
      ? `HTTP ${responseStatus}: ${error.message}`
      : error.message;

    // Determine if should retry
    const shouldRetry = attemptsMade < delivery.maxAttempts;
    const status = shouldRetry ? 'PENDING' : 'FAILED';

    // Calculate next retry time (exponential backoff)
    const nextAttemptAt = shouldRetry
      ? new Date(Date.now() + Math.pow(2, attemptsMade) * 5000)
      : null;

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        responseStatus,
        responseBody: isAxiosError
          ? JSON.stringify(error.response?.data).substring(0, 10000)
          : null,
        errorMessage: errorMessage.substring(0, 1000),
        nextAttemptAt,
      },
    });

    if (shouldRetry) {
      this.logger.warn(
        `Webhook ${deliveryId} failed (attempt ${attemptsMade}/${delivery.maxAttempts}), will retry`,
      );
    } else {
      this.logger.error(
        `Webhook ${deliveryId} failed permanently after ${attemptsMade} attempts`,
      );
    }

    // Rethrow to trigger BullMQ retry
    if (shouldRetry) {
      throw error;
    }
  }

  private generateSignature(payload: any, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}
