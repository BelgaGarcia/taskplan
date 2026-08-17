import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { RolesModule } from './modules/roles/roles.module';
import { PositionsModule } from './modules/positions/positions.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './database/redis/redis.module';
import { FunctionsModule } from './modules/functions/functions.module';
import { PeriodicitiesModule } from './modules/periodicities/periodicities.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TaskOccurrencesModule } from './modules/task-occurrences/task-occurrences.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    PrismaModule,
    HealthModule,
    RolesModule,
    PositionsModule,
    UsersModule,
    AuthModule,
    RedisModule,
    FunctionsModule,
    PeriodicitiesModule,
    HolidaysModule,
    TasksModule,
    TaskOccurrencesModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
