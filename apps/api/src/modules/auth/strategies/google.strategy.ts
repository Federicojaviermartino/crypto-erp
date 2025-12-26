import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly isConfigured: boolean;

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || 'not-configured';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured';
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/auth/google/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });

    this.isConfigured = clientID !== 'not-configured' && clientSecret !== 'not-configured';
    if (!this.isConfigured) {
      this.logger.warn('Google OAuth not configured - GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, emails, name, photos } = profile;

      if (!emails || emails.length === 0) {
        throw new UnauthorizedException('No email found in Google profile');
      }

      const email = emails[0].value;

      // Auto-provision or find existing SSO user
      const user = await this.authService.findOrCreateSSOUser({
        ssoProvider: 'google',
        ssoId: id,
        email,
        firstName: name.givenName,
        lastName: name.familyName,
        avatarUrl: photos?.[0]?.value,
        ssoMetadata: {
          accessToken,
          refreshToken,
          locale: profile._json.locale,
        },
      });

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
