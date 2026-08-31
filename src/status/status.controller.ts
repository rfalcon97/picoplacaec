import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { StatusService } from './status.service';

@ApiTags('status')
@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get('city/:slug')
  byCityAndDigit(@Param('slug') slug: string, @Query('digit', ParseIntPipe) digit: number) {
    return this.statusService.statusForCityAndDigit(slug, digit);
  }

  @Get('vehicles')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  forMyVehicles(@CurrentUser() user: AuthenticatedUser) {
    return this.statusService.statusForAllVehicles(user.id);
  }

  @Get('vehicles/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  forOneVehicle(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.statusService.statusForVehicle(user.id, id);
  }
}
