import { Module } from '@nestjs/common';
import { PiiGuardService } from './pii-guard.service';

@Module({
  providers: [PiiGuardService],
  exports: [PiiGuardService],
})
export class GuardrailsModule {}
