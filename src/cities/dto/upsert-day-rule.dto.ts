import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEnum, IsInt, Max, Min } from 'class-validator';
import { Weekday } from '../../../generated/prisma/client';

export class UpsertDayRuleDto {
  @ApiProperty({ enum: Weekday })
  @IsEnum(Weekday)
  weekday: Weekday;

  @ApiProperty({
    type: [Number],
    example: [1, 2],
    description: 'Restricted plate last-digits that day; use an empty array for no restriction',
  })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(9, { each: true })
  digits: number[];
}
