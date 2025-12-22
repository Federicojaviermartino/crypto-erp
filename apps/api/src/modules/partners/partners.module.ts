import { Module } from '@nestjs/common';
import { PartnersController } from './partners.controller.js';
import { PartnersService } from './partners.service.js';
import { PrismaModule } from '@crypto-erp/database';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
