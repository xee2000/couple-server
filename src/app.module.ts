import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { CouplesModule } from './couples/couples.module';
import { EventsModule } from './events/events.module';
import { AnniversariesModule } from './anniversaries/anniversaries.module';
import { CyclesModule } from './cycles/cycles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    CouplesModule,
    EventsModule,
    AnniversariesModule,
    CyclesModule,
  ],
})
export class AppModule {}
