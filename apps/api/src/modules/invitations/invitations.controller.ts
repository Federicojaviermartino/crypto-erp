import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetCompany } from '../auth/decorators/get-company.decorator';
import { UserRole, InvitationStatus } from '@prisma/client';

@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /**
   * Create a new invitation
   * Only ADMIN and OWNER can invite users
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async create(
    @GetUser('id') userId: string,
    @GetCompany() companyId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.createInvitation(companyId, userId, dto);
  }

  /**
   * Accept an invitation by token
   */
  @Post(':token/accept')
  async accept(@Param('token') token: string, @GetUser('id') userId: string) {
    return this.invitationsService.acceptInvitation(token, userId);
  }

  /**
   * Cancel an invitation
   * Only ADMIN, OWNER, or the inviter can cancel
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async cancel(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetCompany() companyId: string,
  ) {
    return this.invitationsService.cancelInvitation(id, userId, companyId);
  }

  /**
   * List all invitations for current company
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ACCOUNTANT)
  async list(
    @GetCompany() companyId: string,
    @Query('status') status?: InvitationStatus,
  ) {
    return this.invitationsService.findByCompany(companyId, status);
  }

  /**
   * Get invitation details by token (public endpoint for accepting)
   */
  @Get('token/:token')
  async getByToken(@Param('token') token: string) {
    return this.invitationsService.findByToken(token);
  }
}
