import { Equals, IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_REGEX, PASSWORD_MESSAGE } from '../../common/validators/password';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  @IsString()
  @MinLength(1)
  fullName: string;

  @IsString()
  @Matches(/^[0-9+\-\s()]{9,15}$/, { message: 'Enter a valid phone number' })
  phoneNumber: string;

  /** FR-2: terms of use and privacy notice must be accepted before account creation. */
  @Equals(true, { message: 'You must accept the terms of use and privacy notice' })
  acceptedTerms: boolean;
}
