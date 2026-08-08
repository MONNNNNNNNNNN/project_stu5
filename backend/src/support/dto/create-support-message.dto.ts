import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateSupportMessageDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  @MinLength(1)
  message: string;
}
