import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AnswersService } from './answers.service';

@Controller('answers')
@UseGuards(JwtAuthGuard)
export class AnswersController {
  constructor(private service: AnswersService) {}

  /** 내 답변 + 파트너 답변 조회 */
  @Get()
  getAll(@CurrentUser() user: { id: string }) {
    return this.service.getAll(user.id);
  }

  /** 답변 저장/수정 */
  @Put(':questionKey')
  upsert(
    @CurrentUser() user: { id: string },
    @Param('questionKey') questionKey: string,
    @Body('answer') answer: string,
  ) {
    return this.service.upsert(user.id, questionKey, answer);
  }

  /** 답변 삭제 */
  @Delete(':questionKey')
  remove(
    @CurrentUser() user: { id: string },
    @Param('questionKey') questionKey: string,
  ) {
    return this.service.remove(user.id, questionKey);
  }
}
