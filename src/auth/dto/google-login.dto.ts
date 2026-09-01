import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'ID token obtained from Google Sign-In on the client' })
  @IsString()
  idToken: string;
}
