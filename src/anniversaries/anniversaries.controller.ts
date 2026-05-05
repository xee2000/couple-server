import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AnniversariesService } from './anniversaries.service';

@Controller('anniversaries')
@UseGuards(JwtAuthGuard)
export class AnniversariesController {
  constructor(private service: AnniversariesService) {}

  @Get()
  getAll(@CurrentUser() user: { id: string }) {
    return this.service.getAll(user.id);
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() body: any) {
    return this.service.create(user.id, body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
