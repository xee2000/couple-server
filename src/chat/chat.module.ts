import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    SupabaseModule,
    NotificationsModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
