import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../common/prisma.service';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(
    private readonly referralsService: ReferralsService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getReferralInfo(@Req() req) {
    return this.referralsService.getReferralInfo(req.user.id);
  }

  @Get('link')
  async getReferralLink(@Req() req) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: req.user.id },
      select: { referralCode: true },
    });

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );

    return { link: `${frontendUrl}/auth?ref=${user.referralCode}` };
  }
}
