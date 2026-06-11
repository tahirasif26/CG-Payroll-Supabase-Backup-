import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { ConfigModule } from './config/config.module';
import { TypedConfigService } from './config/typed-config.service';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { RealtimeModule } from './infrastructure/realtime/realtime.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { OrgStructureModule } from './modules/org-structure/org-structure.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { LeaveModule } from './modules/leave/leave.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { AdvancesModule } from './modules/advances/advances.module';
import { LoansModule } from './modules/loans/loans.module';
import { AssetsModule } from './modules/assets/assets.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { SeparationsModule } from './modules/separations/separations.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { HealthModule } from './modules/health/health.module';

interface RequestWithCorrelationId {
  correlationId?: string;
}

@Module({
  imports: [
    ConfigModule,

    LoggerModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL'),
          genReqId: (req: unknown) =>
            (req as RequestWithCorrelationId).correlationId ?? randomUUID(),
          customProps: (req: unknown) => ({
            correlationId: (req as RequestWithCorrelationId).correlationId,
          }),
          transport: config.isProd
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname,req,res,responseTime',
                },
              },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              '*.password',
              '*.passwordHash',
              '*.token',
              '*.refreshToken',
            ],
            remove: true,
          },
        },
      }),
    }),

    ScheduleModule.forRoot(),

    ThrottlerModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL') * 1000,
          limit: config.get('THROTTLE_LIMIT'),
        },
      ],
    }),

    // Infrastructure
    PrismaModule,
    MailModule,
    StorageModule,
    RealtimeModule,

    // Cross-cutting
    RbacModule,
    AuthModule,
    NotificationsModule, // notifications + audit + approvals are exported globally
    AuditModule,
    ApprovalsModule,

    // Domain modules
    UsersModule,
    TenantsModule,
    InvitationsModule,
    EmployeesModule,
    OrgStructureModule,
    LeaveModule,
    ExpensesModule,
    AdvancesModule,
    LoansModule,
    AssetsModule,
    PayrollModule,
    PerformanceModule,
    SeparationsModule,
    RemindersModule,

    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
