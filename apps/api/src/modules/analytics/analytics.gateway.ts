import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';

interface SubscriptionRequest {
  companyId: string;
  metrics: string[];
  interval?: number; // Refresh interval in milliseconds
}

interface ClientSubscription {
  companyId: string;
  metrics: string[];
  intervalId?: NodeJS.Timeout;
}

@WebSocketGateway({
  namespace: '/analytics',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class AnalyticsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AnalyticsGateway.name);
  private subscriptions = new Map<string, ClientSubscription>();

  constructor(private readonly analyticsService: AnalyticsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.unsubscribeClient(client.id);
  }

  /**
   * Subscribe to real-time analytics updates
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscriptionRequest,
  ): Promise<void> {
    const { companyId, metrics, interval = 30000 } = data;

    // Unsubscribe from previous subscriptions
    this.unsubscribeClient(client.id);

    // Store subscription
    const subscription: ClientSubscription = {
      companyId,
      metrics,
    };

    // Send initial data
    await this.sendMetricsUpdate(client, companyId, metrics);

    // Set up periodic updates
    subscription.intervalId = setInterval(async () => {
      await this.sendMetricsUpdate(client, companyId, metrics);
    }, Math.max(interval, 10000)); // Minimum 10 seconds

    this.subscriptions.set(client.id, subscription);

    client.emit('subscribed', {
      message: 'Successfully subscribed to analytics',
      metrics,
      interval,
    });
  }

  /**
   * Unsubscribe from updates
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket): void {
    this.unsubscribeClient(client.id);
    client.emit('unsubscribed', { message: 'Unsubscribed from analytics' });
  }

  /**
   * Request immediate update
   */
  @SubscribeMessage('refresh')
  async handleRefresh(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { companyId: string; metrics?: string[] },
  ): Promise<void> {
    const subscription = this.subscriptions.get(client.id);
    const metrics = data.metrics || subscription?.metrics || ['dashboard'];

    await this.sendMetricsUpdate(client, data.companyId, metrics);
  }

  /**
   * Get specific metric on demand
   */
  @SubscribeMessage('getMetric')
  async handleGetMetric(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { companyId: string; metric: string; params?: any },
  ): Promise<void> {
    const { companyId, metric, params } = data;

    try {
      const result = await this.fetchMetric(companyId, metric, params);
      client.emit('metric', { metric, data: result, timestamp: new Date() });
    } catch (error) {
      client.emit('error', { metric, message: (error as Error).message });
    }
  }

  /**
   * Broadcast update to all clients subscribed to a company
   * Can be called from other services when data changes
   */
  broadcastToCompany(companyId: string, event: string, data: any): void {
    for (const [clientId, subscription] of this.subscriptions.entries()) {
      if (subscription.companyId === companyId) {
        this.server.to(clientId).emit(event, data);
      }
    }
  }

  /**
   * Notify about new invoice
   */
  notifyNewInvoice(companyId: string, invoice: any): void {
    this.broadcastToCompany(companyId, 'newInvoice', {
      type: 'invoice',
      action: 'created',
      data: invoice,
      timestamp: new Date(),
    });
  }

  /**
   * Notify about new transaction
   */
  notifyNewTransaction(companyId: string, transaction: any): void {
    this.broadcastToCompany(companyId, 'newTransaction', {
      type: 'transaction',
      action: 'created',
      data: transaction,
      timestamp: new Date(),
    });
  }

  /**
   * Notify about portfolio change
   */
  notifyPortfolioChange(companyId: string, change: any): void {
    this.broadcastToCompany(companyId, 'portfolioChange', {
      type: 'portfolio',
      action: 'updated',
      data: change,
      timestamp: new Date(),
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private unsubscribeClient(clientId: string): void {
    const subscription = this.subscriptions.get(clientId);
    if (subscription?.intervalId) {
      clearInterval(subscription.intervalId);
    }
    this.subscriptions.delete(clientId);
  }

  private async sendMetricsUpdate(
    client: Socket,
    companyId: string,
    metrics: string[],
  ): Promise<void> {
    try {
      const data: Record<string, any> = {};

      for (const metric of metrics) {
        data[metric] = await this.fetchMetric(companyId, metric);
      }

      client.emit('metricsUpdate', {
        metrics: data,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error sending metrics update: ${(error as Error).message}`);
      client.emit('error', { message: 'Failed to fetch metrics' });
    }
  }

  private async fetchMetric(
    companyId: string,
    metric: string,
    params?: any,
  ): Promise<any> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (metric) {
      case 'dashboard':
        return this.analyticsService.getDashboardMetrics(companyId);

      case 'summary':
        return this.analyticsService.getCompleteDashboardSummary(companyId);

      case 'revenue':
        return this.analyticsService.getRevenueMetrics(
          companyId,
          params?.startDate ? new Date(params.startDate) : startOfMonth,
          params?.endDate ? new Date(params.endDate) : now,
        );

      case 'users':
        return this.analyticsService.getUserMetrics(
          companyId,
          params?.startDate ? new Date(params.startDate) : startOfMonth,
          params?.endDate ? new Date(params.endDate) : now,
        );

      case 'invoices':
        return this.analyticsService.getInvoiceAnalytics(
          companyId,
          params?.startDate ? new Date(params.startDate) : startOfMonth,
          params?.endDate ? new Date(params.endDate) : now,
        );

      case 'crypto':
        return this.analyticsService.getCryptoPortfolioAnalytics(
          companyId,
          params?.startDate ? new Date(params.startDate) : startOfYear,
          params?.endDate ? new Date(params.endDate) : now,
        );

      case 'portfolio':
        return this.analyticsService.getPortfolioOverview(companyId);

      case 'transactions':
        return this.analyticsService.getTransactionStats(
          companyId,
          params?.startDate ? new Date(params.startDate) : startOfMonth,
          params?.endDate ? new Date(params.endDate) : now,
        );

      default:
        return this.analyticsService.getDashboardMetrics(companyId);
    }
  }
}
