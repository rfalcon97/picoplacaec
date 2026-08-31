import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl, Matches, MinLength } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateCityDto {
  @ApiProperty({ example: 'quito', description: 'Lowercase, URL-safe identifier' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must contain only lowercase letters, numbers, and hyphens' })
  slug: string;

  @ApiProperty({ example: 'Quito' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ default: false, description: 'True if the restriction applies the whole day' })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ example: '07:00', description: 'HH:mm, required unless allDay is true' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'timeStart must be in HH:mm format' })
  timeStart?: string;

  @ApiPropertyOptional({ example: '19:30', description: 'HH:mm, required unless allDay is true' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'timeEnd must be in HH:mm format' })
  timeEnd?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  suspendsOnNationalHolidays?: boolean;

  @ApiPropertyOptional({ example: 'https://www.quito.gob.ec/pico-y-placa' })
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;
}
