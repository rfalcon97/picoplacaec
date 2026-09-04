import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanRouteDto } from './dto/plan-route.dto';
import { RoutesService } from './routes.service';

@ApiTags('routes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get('search')
  search(@Query('query') query: string) {
    return this.routesService.searchPlaces(query);
  }

  @Post('plan')
  plan(@Body() dto: PlanRouteDto) {
    return this.routesService.planRoute(dto);
  }
}
