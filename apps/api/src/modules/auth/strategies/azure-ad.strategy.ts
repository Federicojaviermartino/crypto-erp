import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BearerStrategy } from 'passport-azure-ad';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class AzureADStrategy extends PassportStrategy(BearerStrategy, 'azure-ad') {
  private readonly logger = new Logger(AzureADStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const tenantId = configService.get<string>('AZURE_TENANT_ID') || 'common';
    const clientId = configService.get<string>('AZURE_CLIENT_ID') || 'not-configured';

    super({
      identityMetadata: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
      clientID: clientId,
      validateIssuer: clientId !== 'not-configured',
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      passReqToCallback: false,
      loggingLevel: 'warn',
      scope: ['email', 'profile', 'openid'],
    });

    if (clientId === 'not-configured') {
      this.logger.warn('Azure AD OAuth not configured - AZURE_CLIENT_ID/AZURE_TENANT_ID missing');
    }
  }

  async validate(payload: any): Promise<any> {
    try {
      const { oid, preferred_username, name, email } = payload;

      if (!email && !preferred_username) {
        throw new UnauthorizedException('No email found in Azure AD profile');
      }

      const userEmail = email || preferred_username;
      const nameParts = name?.split(' ') || ['', ''];

      // Auto-provision or find existing SSO user
      const user = await this.authService.findOrCreateSSOUser({
        ssoProvider: 'azure',
        ssoId: oid,
        email: userEmail,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || nameParts[0],
        ssoMetadata: {
          tenantId: payload.tid,
          upn: payload.upn,
          roles: payload.roles || [],
        },
      });

      return user;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
