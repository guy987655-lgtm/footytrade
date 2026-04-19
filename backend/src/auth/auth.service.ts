import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma.service';

interface GoogleProfile {
  id: string;
  emails: { value: string }[];
  displayName: string;
  referralCode?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateGoogleUser(profile: GoogleProfile): Promise<User> {
    const email = profile.emails[0].value;

    const existing = await this.prisma.user.findUnique({
      where: { googleId: profile.id },
    });
    if (existing) return existing;

    const initialCredits = parseFloat(this.config.get('INITIAL_CREDITS', '10000'));
    const referralCode = randomUUID().replace(/-/g, '').slice(0, 8);

    let referredById: string | undefined;
    if (profile.referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: profile.referralCode },
      });
      if (referrer) referredById = referrer.id;
    }

    const user = await this.prisma.user.create({
      data: {
        googleId: profile.id,
        email,
        name: profile.displayName,
        credits: initialCredits,
        referralCode,
        ...(referredById && { referredById }),
      },
    });

    if (referredById) {
      await this.prisma.referralBonus.create({
        data: {
          referrerId: referredById,
          refereeId: user.id,
          status: 'PENDING',
        },
      });
    }

    return user;
  }

  generateJwt(user: User): { access_token: string } {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return { access_token: this.jwt.sign(payload) };
  }

  async validateJwtPayload(payload: {
    sub: string;
  }): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: payload.sub } });
  }
}
