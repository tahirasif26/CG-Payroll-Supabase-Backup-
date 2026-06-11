import { Module } from '@nestjs/common';
import { OrgStructureController } from './org-structure.controller';
import { OrgStructureService } from './org-structure.service';

@Module({
  controllers: [OrgStructureController],
  providers: [OrgStructureService],
  exports: [OrgStructureService],
})
export class OrgStructureModule {}
