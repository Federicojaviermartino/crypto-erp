import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto';
import { UpdateWebhookSubscriptionDto } from './dto/update-webhook-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetCompany } from '../auth/decorators/get-company.decorator';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks/subscriptions')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Create webhook subscription' })
  create(
    @GetCompany() companyId: string,
    @Body() dto: CreateWebhookSubscriptionDto,
  ) {
    return this.webhooksService.createSubscription(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhook subscriptions' })
  findAll(@GetCompany() companyId: string) {
    return this.webhooksService.findAllByCompany(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webhook subscription by ID' })
  findOne(@Param('id') id: string, @GetCompany() companyId: string) {
    return this.webhooksService.findOne(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update webhook subscription' })
  update(
    @Param('id') id: string,
    @GetCompany() companyId: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
  ) {
    return this.webhooksService.updateSubscription(id, companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete webhook subscription' })
  remove(@Param('id') id: string, @GetCompany() companyId: string) {
    return this.webhooksService.deleteSubscription(id, companyId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send test webhook' })
  test(@Param('id') id: string, @GetCompany() companyId: string) {
    return this.webhooksService.testWebhook(id, companyId);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get webhook delivery history' })
  getDeliveries(
    @Param('id') id: string,
    @GetCompany() companyId: string,
    @Query('limit') limit?: number,
  ) {
    return this.webhooksService.getDeliveryHistory(id, companyId, limit);
  }
}
