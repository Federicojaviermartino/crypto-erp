import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CreateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto';
import { UpdateWebhookSubscriptionDto } from './dto/update-webhook-subscription.dto';
import { WebhookEventDto } from './dto/webhook-event.dto';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('webhook-delivery') private webhookQueue: Queue,
  ) {}

  async createSubscription(companyId: string, dto: CreateWebhookSubscriptionDto) {
    const secret = this.generateSecret();

    const subscription = await this.prisma.webhookSubscription.create({
      data: {
        companyId,
        url: dto.url,
        secret,
        events: dto.events,
        description: dto.description,
        retryCount: dto.retryCount ?? 3,
        timeout: dto.timeout ?? 30000,
        metadata: dto.metadata ?? {},
      },
    });

    this.logger.log(`Created webhook subscription ${subscription.id}`);
    return { ...subscription, secret };
  }

  async findAllByCompany(companyId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { companyId },
      select: {
        id: true,
        url: true,
        isActive: true,
        events: true,
        description: true,
        retryCount: true,
        timeout: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: { id, companyId },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    const { secret, ...rest } = subscription;
    return rest;
  }

  async updateSubscription(id: string, companyId: string, dto: UpdateWebhookSubscriptionDto) {
    await this.findOne(id, companyId);

    const updated = await this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        url: dto.url,
        isActive: dto.isActive,
        events: dto.events,
        description: dto.description,
        retryCount: dto.retryCount,
        timeout: dto.timeout,
        metadata: dto.metadata,
      },
    });

    this.logger.log(`Updated webhook subscription ${id}`);
    const { secret, ...rest } = updated;
    return rest;
  }

  async deleteSubscription(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.webhookSubscription.delete({ where: { id } });
    this.logger.log(`Deleted webhook subscription ${id}`);
  }

  async emitEvent(companyId: string, eventDto: WebhookEventDto) {
    await this.prisma.webhookEvent.create({
      data: {
        companyId,
        event: eventDto.event,
        entityType: eventDto.entityType,
        entityId: eventDto.entityId,
        payload: eventDto.payload,
      },
    });

    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: { companyId, isActive: true },
    });

    const subscribedTo = subscriptions.filter((sub) => {
      const events = sub.events as string[];
      return events.includes(eventDto.event) || events.includes('*');
    });

    this.logger.log(`Emitting ${eventDto.event} to ${subscribedTo.length} subscriptions`);

    for (const subscription of subscribedTo) {
      await this.queueDelivery(subscription, eventDto);
    }
  }

  private async queueDelivery(subscription: any, eventDto: WebhookEventDto) {
    const payloadHash = this.hashPayload(eventDto.payload);

    const existing = await this.prisma.webhookDelivery.findFirst({
      where: {
        subscriptionId: subscription.id,
        payloadHash,
        status: { in: ['PENDING', 'SENDING', 'DELIVERED'] },
      },
    });

    if (existing) {
      this.logger.debug(`Skipping duplicate delivery`);
      return;
    }

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        subscriptionId: subscription.id,
        event: eventDto.event,
        payload: eventDto.payload,
        payloadHash,
        maxAttempts: subscription.retryCount,
      },
    });

    await this.webhookQueue.add(
      'send-webhook',
      {
        deliveryId: delivery.id,
        subscriptionId: subscription.id,
        url: subscription.url,
        secret: subscription.secret,
        event: eventDto.event,
        payload: eventDto.payload,
        timeout: subscription.timeout,
      },
      {
        attempts: subscription.retryCount + 1,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  async getDeliveryHistory(subscriptionId: string, companyId: string, limit = 50) {
    await this.findOne(subscriptionId, companyId);

    return this.prisma.webhookDelivery.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        event: true,
        status: true,
        attemptCount: true,
        responseStatus: true,
        errorMessage: true,
        scheduledFor: true,
        lastAttemptAt: true,
        deliveredAt: true,
        createdAt: true,
      },
    });
  }

  async testWebhook(id: string, companyId: string) {
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: { id, companyId },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    await this.emitEvent(companyId, {
      event: 'webhook.test',
      entityType: 'WebhookSubscription',
      entityId: id,
      payload: {
        message: 'Test webhook',
        timestamp: new Date().toISOString(),
      },
    });

    return { message: 'Test webhook queued' };
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashPayload(payload: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  static generateSignature(payload: any, secret: string): string {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  }
}
