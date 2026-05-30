import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { CouplesModule } from './couples/couples.module';
import { EventsModule } from './events/events.module';
import { AnniversariesModule } from './anniversaries/anniversaries.module';
import { CyclesModule } from './cycles/cycles.module';
import { UsersModule } from './users/users.module';
import { AlbumsModule } from './albums/albums.module';
import { AnswersModule } from './answers/answers.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/static',
    }),
    SupabaseModule,
    AuthModule,
    CouplesModule,
    EventsModule,
    AnniversariesModule,
    CyclesModule,
    UsersModule,
    AlbumsModule,
    AnswersModule,
    ChatModule,
  ],
})
export class AppModule {}
