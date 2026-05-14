import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CouplesService } from './couples.service';

@Controller('couples')
@UseGuards(JwtAuthGuard)
export class CouplesController {
  constructor(private service: CouplesService) {}

  /** 내 커플 정보 조회 */
  @Get('me')
  getMyCouple(@CurrentUser() user: { id: string }) {
    return this.service.getMyCouple(user.id);
  }

  /** 초대 코드 생성 (커플 방 생성) */
  @Post('create')
  createCouple(
    @CurrentUser() user: { id: string },
    @Body('startDate') startDate?: string,
  ) {
    return this.service.createCouple(user.id, startDate);
  }

  /** 처음 사귄날 저장 */
  @Patch('start-date')
  updateStartDate(
    @CurrentUser() user: { id: string },
    @Body('startDate') startDate: string,
  ) {
    return this.service.updateStartDate(user.id, startDate);
  }

  /** 공유 끊기 (계정 유지, 공유 데이터 삭제) */
  @Delete('disconnect')
  disconnectCouple(@CurrentUser() user: { id: string }) {
    return this.service.disconnectCouple(user.id);
  }

  /** 초대 코드로 커플 연결 */
  @Post('join')
  joinCouple(
    @CurrentUser() user: { id: string },
    @Body('inviteCode') inviteCode: string,
  ) {
    return this.service.joinCouple(user.id, inviteCode);
  }
}
