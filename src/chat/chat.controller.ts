import {
  Controller, Get, Post, Query, Body,
  UseGuards, Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  /** GET /chat?before=<ISO>&after=<ISO>  — 메시지 목록 */
  @Get()
  getMessages(
    @Request() req,
    @Query('before') before?: string,
    @Query('after') after?: string,
  ) {
    return this.chatService.getMessages(req.user.sub, before, after);
  }

  /** POST /chat  — 텍스트 / 이모티콘 메시지 전송 */
  @Post()
  sendMessage(@Request() req, @Body() body: any) {
    return this.chatService.sendMessage(req.user.sub, body);
  }

  /** POST /chat/upload  — 이미지 / 영상 업로드 */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  uploadFile(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.chatService.uploadFile(req.user.sub, file);
  }
}
