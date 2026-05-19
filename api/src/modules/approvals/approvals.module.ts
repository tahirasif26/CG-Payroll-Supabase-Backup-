import { Global, Module } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { AuthModule } from '@modules/auth/auth.module';

/**
 * Exported globally so domain modules (leave / expenses / advances / loans /
 * payroll) can call `approvals.submitForApproval(...)` from their submit flows.
 */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
