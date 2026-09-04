import { Module } from '@nestjs/common';
import { WeatherModule } from '../weather/weather.module';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [WeatherModule],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {}
