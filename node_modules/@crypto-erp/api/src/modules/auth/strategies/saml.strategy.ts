import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-saml';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, 'saml') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      entryPoint: configService.get<string>('SAML_ENTRY_POINT'),
      issuer: configService.get<string>('SAML_ISSUER'),
      callbackUrl: configService.get<string>('SAML_CALLBACK_URL'),
      cert: configService.get<string>('SAML_CERT'),
      acceptedClockSkewMs: -1,
      identifierFormat: null,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
    });
  }

  async validate(profile: Profile): Promise<any> {
    try {
      const { nameID, email, firstName, lastName, displayName } = profile;

      if (!email && !nameID) {
        throw new UnauthorizedException('No email found in SAML profile');
      }

      const userEmail = email || nameID;
      const fname = firstName || displayName?.split(' ')[0] || 'User';
      const lname = lastName || displayName?.split(' ').slice(1).join(' ') || 'User';

      // Auto-provision or find existing SSO user
      const user = await this.authService.findOrCreateSSOUser({
        ssoProvider: 'saml',
        ssoId: nameID,
        email: userEmail,
        firstName: fname,
        lastName: lname,
        ssoMetadata: {
          sessionIndex: profile.sessionIndex,
          attributes: profile,
        },
      });

      return user;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
