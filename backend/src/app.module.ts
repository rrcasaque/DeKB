import { Module } from '@nestjs/common';
import { ContributionModule } from './contribution/contribution.module';

@Module({
  imports: [ContributionModule],
})
export class AppModule {}
