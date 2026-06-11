import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { AuthModule } from '@modules/auth/auth.module';
import { InvitationsModule } from '@modules/invitations/invitations.module';

@Module({
  imports: [AuthModule, InvitationsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
