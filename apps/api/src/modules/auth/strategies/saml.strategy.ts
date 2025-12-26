import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-saml';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, 'saml') {
  private readonly logger = new Logger(SamlStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const entryPoint = configService.get<string>('SAML_ENTRY_POINT') || 'https://not-configured.example.com/saml/sso';
    const issuer = configService.get<string>('SAML_ISSUER') || 'not-configured';
    const callbackUrl = configService.get<string>('SAML_CALLBACK_URL') || 'http://localhost:3000/auth/saml/callback';

    // Dummy cert when not configured (required by passport-saml)
    const dummyCert = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQDU+pQ4P0PxjzANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
-----END CERTIFICATE-----`;

    super({
      entryPoint,
      issuer,
      callbackUrl,
      cert: configService.get<string>('SAML_CERT') || dummyCert,
      acceptedClockSkewMs: -1,
      identifierFormat: null,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
    });

    if (issuer === 'not-configured') {
      this.logger.warn('SAML OAuth not configured - SAML_ENTRY_POINT/SAML_ISSUER missing');
    }
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
