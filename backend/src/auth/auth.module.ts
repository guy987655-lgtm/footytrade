import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {
  private readonly logger = new Logger(AuthModule.name);

  constructor(private readonly config: ConfigService) {
    const googleId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (googleId) {
      this.logger.log('Google OAuth is configured');
    } else {
      this.logger.warn(
        'GOOGLE_CLIENT_ID not set — Google OAuth disabled. Use POST /auth/dev-login instead.',
      );
    }
  }
}
