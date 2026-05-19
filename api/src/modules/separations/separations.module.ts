import { Module } from '@nestjs/common';
import { SeparationsController } from './separations.controller';
import { SeparationsService } from './separations.service';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SeparationsController],
  providers: [SeparationsService],
  exports: [SeparationsService],
})
export class SeparationsModule {}
