import { IsString, Matches } from 'class-validator';
import { PASSWORD_REGEX, PASSWORD_MESSAGE } from '../../common/validators/password';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
