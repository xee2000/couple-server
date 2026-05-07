import { Body, Controller, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private service: UsersService) {}

  /** FCM 토큰 저장 */
  @Post('fcm-token')
  saveFcmToken(
    @CurrentUser() user: { id: string },
    @Body('token') token: string,
  ) {
    return this.service.saveFcmToken(user.id, token);
  }

  /** 성별 저장 — 최초 1회 */
  @Put('gender')
  saveGender(
    @CurrentUser() user: { id: string },
    @Body('gender') gender: 'male' | 'female',
  ) {
    return this.service.saveGender(user.id, gender);
  }
}
