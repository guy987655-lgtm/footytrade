import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@prisma/client';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../common/prisma.service';
import { randomUUID } from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: any, @Res() res: Response) {
    const { access_token } = this.authService.generateJwt(req.user as User);
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    res.redirect(`${frontendUrl}/auth/callback?token=${access_token}`);
  }

  @Post('dev-login')
  async devLogin(@Body() body: { email: string; name: string }) {
    let user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          credits: parseFloat(this.config.get('INITIAL_CREDITS', '10000')),
          referralCode: randomUUID().replace(/-/g, '').slice(0, 8),
        },
      });
    }

    return this.authService.generateJwt(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any): User {
    return req.user;
  }
}
