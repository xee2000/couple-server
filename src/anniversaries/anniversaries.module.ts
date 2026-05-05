import { Module } from '@nestjs/common';
import { AnniversariesController } from './anniversaries.controller';
import { AnniversariesService } from './anniversaries.service';

@Module({ controllers: [AnniversariesController], providers: [AnniversariesService] })
export class AnniversariesModule {}
