import { Equals, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
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

  /**
   * Optional. Dropped from the registration form on 2026-08-22 — nothing in the app contacts
   * a parent by phone, and asking a stranger for a number before they have seen anything is
   * friction that buys nothing. Kept on the DTO and the column so the profile screen can add
   * one later, and so existing records keep theirs.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{9,15}$/, { message: 'Enter a valid phone number' })
  phoneNumber?: string;

  /** FR-2: terms of use and privacy notice must be accepted before account creation. */
  @Equals(true, { message: 'You must accept the terms of use and privacy notice' })
  acceptedTerms: boolean;
}
