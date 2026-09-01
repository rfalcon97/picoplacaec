import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { PushService } from './push.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('register-token')
  @ApiOkResponse({ description: 'Device token registered for push notifications' })
  async registerToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterDeviceTokenDto) {
    await this.pushService.registerToken(user.id, dto.token, dto.platform);
    return { message: 'Token registered' };
  }
}
