import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BearerStrategy } from 'passport-azure-ad';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class AzureADStrategy extends PassportStrategy(BearerStrategy, 'azure-ad') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      identityMetadata: `https://login.microsoftonline.com/${configService.get('AZURE_TENANT_ID')}/v2.0/.well-known/openid-configuration`,
      clientID: configService.get<string>('AZURE_CLIENT_ID'),
      validateIssuer: true,
      issuer: `https://login.microsoftonline.com/${configService.get('AZURE_TENANT_ID')}/v2.0`,
      passReqToCallback: false,
      loggingLevel: 'warn',
      scope: ['email', 'profile', 'openid'],
    });
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
