import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('city/:slug')
  forCity(@Param('slug') slug: string) {
    return this.weatherService.getWeatherForCity(slug);
  }
}
