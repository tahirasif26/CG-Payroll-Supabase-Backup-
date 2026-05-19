import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AuthModule } from '@modules/auth/auth.module';

/**
 * NotificationsService is exported globally so other modules (approvals,
 * payroll, reminders) can call `create()` / `notifyClientAdmins()` without
 * importing the module explicitly.
 */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
