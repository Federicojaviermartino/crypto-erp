import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { MetricsService } from './metrics.service.js';

@ApiTags('monitoring')
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus metrics endpoint
   * This endpoint is scraped by Prometheus server
   */
  @Get('metrics')
  @ApiExcludeEndpoint() // Don't show in Swagger
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  /**
   * Custom metrics summary (JSON format for dashboards)
   */
  @Get('metrics/summary')
  @ApiOperation({
    summary: 'Get metrics summary',
    description: 'Returns a JSON summary of key metrics for custom dashboards',
  })
  async getMetricsSummary() {
    // This could return a JSON version of key metrics
    // Useful for custom dashboards or monitoring tools
    return {
      message: 'Use /metrics endpoint for Prometheus scraping',
      endpoints: {
        prometheus: '/metrics',
        health: '/health',
      },
    };
  }
}
