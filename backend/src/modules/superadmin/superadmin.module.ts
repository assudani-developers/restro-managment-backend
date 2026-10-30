import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';

@Module({
  imports: [PrismaModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
