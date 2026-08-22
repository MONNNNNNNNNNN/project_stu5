import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  /** The ID token (JWT) that Google Identity Services hands the browser. */
  @IsString()
  @MinLength(1)
  credential: string;

  /**
   * FR-2, for first-time sign-ins only. Existing accounts already accepted at registration,
   * so this is ignored for them — asking twice would be noise.
   */
  @IsOptional()
  @IsBoolean()
  acceptedTerms?: boolean;
}
