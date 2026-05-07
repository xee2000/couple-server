import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CyclesService } from './cycles.service';

@Controller('cycles')
@UseGuards(JwtAuthGuard)
export class CyclesController {
  constructor(private service: CyclesService) {}

  /** 내 + 파트너 생리 주기 조회 */
  @Get()
  getAll(@CurrentUser() user: { id: string }) {
    return this.service.getAll(user.id);
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() body: any) {
    return this.service.create(user.id, body);
  }

  @Put(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.update(id, user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
