import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482913', description: '6-digit code sent by email' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({ example: 'nuevaContraseñaSegura123', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
