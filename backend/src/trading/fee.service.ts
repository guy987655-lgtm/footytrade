import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class FeeService {
  private static readonly DEFAULT_FEE_PERCENT = 2;

  constructor(private readonly prisma: PrismaService) {}

  async calculateFee(
    amount: number,
  ): Promise<{ fee: number; netAmount: number }> {
    const setting = await this.prisma.adminSetting.findUnique({
      where: { key: 'feePercent' },
    });

    const feePercent = setting
      ? parseFloat(setting.value)
      : FeeService.DEFAULT_FEE_PERCENT;

    const fee = Math.round(amount * (feePercent / 100) * 100) / 100;
    const netAmount = Math.round((amount - fee) * 100) / 100;

    return { fee, netAmount };
  }
}
