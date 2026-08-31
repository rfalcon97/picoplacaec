import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCityDto } from './create-city.dto';

export class UpdateCityDto extends PartialType(CreateCityDto) {
  @ApiPropertyOptional({ description: 'Deactivate a city without deleting its configuration' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
