import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'Mi carro' })
  @IsString()
  @MinLength(1)
  nickname: string;

  @ApiProperty({ example: 7, minimum: 0, maximum: 9, description: 'Last digit of the plate' })
  @IsInt()
  @Min(0)
  @Max(9)
  plateDigit: number;

  @ApiProperty({ description: 'City id, from GET /cities' })
  @IsString()
  cityId: string;

  @ApiPropertyOptional({
    example: '20:00',
    default: '20:00',
    description:
      'HH:mm, local device time — when to fire the SAME-DAY reminder on a restricted day. A separate night-before reminder is always sent too, at a fixed default time.',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'reminderTime must be in HH:mm format' })
  reminderTime?: string;
}
