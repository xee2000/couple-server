import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private service: EventsService) {}

  /** 월별 이벤트 조회 ?year=2025&month=4 */
  @Get()
  getEvents(
    @CurrentUser() user: { id: string },
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.getEvents(user.id, Number(year), Number(month));
  }

  /** 이벤트 생성 */
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() body: any) {
    return this.service.create(user.id, body);
  }

  /** 이벤트 수정 */
  @Put(':id')
  update(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() body: any) {
    return this.service.update(id, user.id, body);
  }

  /** 이벤트 삭제 */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.remove(id, user.id);
  }
}
