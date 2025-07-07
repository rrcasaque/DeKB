import { Module } from '@nestjs/common';
import { ContributionModule } from './contribution/contribution.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ContributionModule],
})
export class AppModule {}
