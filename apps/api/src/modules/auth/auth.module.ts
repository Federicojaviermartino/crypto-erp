import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { SsoController } from './controllers/sso.controller.js';
import {
  JwtStrategy,
  JwtRefreshStrategy,
  LocalStrategy,
} from './strategies/index.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { AzureADStrategy } from './strategies/azure-ad.strategy.js';
import { SamlStrategy } from './strategies/saml.strategy.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiresIn') || '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController, SsoController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    LocalStrategy,
    GoogleStrategy,
    AzureADStrategy,
    SamlStrategy,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
