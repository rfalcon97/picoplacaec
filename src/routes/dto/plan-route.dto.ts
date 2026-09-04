import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Max, Min } from 'class-validator';

export class PlanRouteDto {
  @ApiProperty({ example: -0.1807 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  originLat: number;

  @ApiProperty({ example: -78.4678 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  originLng: number;

  @ApiProperty({ example: -0.221 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  destLat: number;

  @ApiProperty({ example: -78.5123 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  destLng: number;

  @ApiProperty({ description: 'Id de la ciudad del vehículo — determina el punto de referencia para el clima' })
  @IsString()
  cityId: string;
}
