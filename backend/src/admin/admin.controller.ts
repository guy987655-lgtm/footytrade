import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('health')
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings/:key')
  updateSetting(@Param('key') key: string, @Body('value') value: string) {
    return this.adminService.updateSetting(key, value);
  }

  @Post('liquidity/inject')
  injectLiquidity(@Body() body: { playerId: string; shares: number }) {
    return this.adminService.injectLiquidity(body.playerId, body.shares);
  }

  @Post('liquidity/remove')
  removeLiquidity(@Body() body: { playerId: string; shares: number }) {
    return this.adminService.removeLiquidity(body.playerId, body.shares);
  }
}
