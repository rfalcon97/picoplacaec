import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

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
}
