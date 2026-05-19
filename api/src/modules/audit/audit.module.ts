import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuthModule } from '@modules/auth/auth.module';

/**
 * AuditService is exported globally so every other module can call
 * `audit.record(...)` without explicit imports. Reads remain admin-only via
 * the controller.
 */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
