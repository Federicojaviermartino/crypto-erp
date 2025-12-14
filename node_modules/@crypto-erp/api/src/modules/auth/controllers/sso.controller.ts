import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth/sso')
export class SsoController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // Google OAuth Login
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;

    // Generate JWT tokens
    const tokens = await this.authService.generateTokens(user);

    // Redirect to frontend with tokens
    const frontendUrl = this.configService.get<string>('WEB_URL');
    const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

    res.redirect(redirectUrl);
  }

  // Azure AD Login
  @Get('azure')
  @UseGuards(AuthGuard('azure-ad'))
  async azureLogin() {
    // Initiates Azure AD OAuth flow
  }

  @Get('azure/callback')
  @UseGuards(AuthGuard('azure-ad'))
  async azureCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;

    // Generate JWT tokens
    const tokens = await this.authService.generateTokens(user);

    // Redirect to frontend with tokens
    const frontendUrl = this.configService.get<string>('WEB_URL');
    const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

    res.redirect(redirectUrl);
  }

  // SAML Login
  @Get('saml')
  @UseGuards(AuthGuard('saml'))
  async samlLogin() {
    // Initiates SAML flow
  }

  @Post('saml/callback')
  @UseGuards(AuthGuard('saml'))
  async samlCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;

    // Generate JWT tokens
    const tokens = await this.authService.generateTokens(user);

    // Redirect to frontend with tokens
    const frontendUrl = this.configService.get<string>('WEB_URL');
    const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

    res.redirect(redirectUrl);
  }

  // SAML Metadata endpoint (for IdP configuration)
  @Get('saml/metadata')
  async samlMetadata(@Res() res: Response) {
    const metadata = this.authService.getSamlMetadata();
    res.type('application/xml');
    res.send(metadata);
  }
}
