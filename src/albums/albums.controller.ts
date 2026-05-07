import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AlbumsService } from './albums.service';

@Controller('albums')
@UseGuards(JwtAuthGuard)
export class AlbumsController {
  constructor(private service: AlbumsService) {}

  /** 앨범 목록 조회 */
  @Get()
  getAll(@CurrentUser() user: { id: string }) {
    return this.service.getAll(user.id);
  }

  /** 앨범 생성 (사진 다중 업로드 → Cloudinary) */
  @Post()
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    }),
  )
  create(
    @CurrentUser() user: { id: string },
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.create(user.id, body, files ?? []);
  }

  /** 앨범 삭제 */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
