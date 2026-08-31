import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDateExceptionDto {
  @ApiProperty({ example: '2026-12-25', description: 'ISO date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Feriado de Navidad' })
  @IsString()
  @MinLength(3)
  reason: string;

  @ApiPropertyOptional({
    default: false,
    description: 'false = restriction suspended that date (the common case); true = restriction still applies',
  })
  @IsOptional()
  @IsBoolean()
  restrictionActive?: boolean;
}
