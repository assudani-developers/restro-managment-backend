import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { BranchAccessService } from '../../common/services/branch-access.service';
import { MenuController } from './menu.controller';
import { MenuOcrService } from './menu-ocr.service';
import { MenuService } from './menu.service';

@Module({
  imports: [AuditModule],
  controllers: [MenuController],
  providers: [MenuService, MenuOcrService, BranchAccessService],
  exports: [MenuService],
})
export class MenuModule {}
