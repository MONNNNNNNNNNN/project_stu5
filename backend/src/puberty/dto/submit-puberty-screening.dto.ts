import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Shape of `answers`, per TOR Annex D (Indicative Puberty Screening Question Categories).
 * Sex-specific fields are optional here since validity depends on the child's sex; the
 * frontend only renders and submits the branch matching the child's sex.
 */
export class PubertyAnswersDto {
  // D.1 — female
  @IsOptional() @IsBoolean() breastDevelopment?: boolean;
  @IsOptional() @IsNumber() @Min(0) breastDevelopmentAgeYears?: number;
  @IsOptional() @IsBoolean() menstruation?: boolean;
  @IsOptional() @IsNumber() @Min(0) menstruationAgeYears?: number;

  // D.2 — male
  @IsOptional() @IsBoolean() testicularOrGenitalEnlargement?: boolean;
  @IsOptional() @IsNumber() @Min(0) testicularOrGenitalEnlargementAgeYears?: number;
  @IsOptional() @IsBoolean() voiceDeepening?: boolean;

  // shared across sexes (pubic/underarm hair item is worded per-sex in Annex D but tracked the same way)
  @IsOptional() @IsBoolean() pubicOrBodyHairGrowth?: boolean;
  @IsOptional() @IsNumber() @Min(0) pubicOrBodyHairGrowthAgeYears?: number;
  @IsOptional() @IsBoolean() growthSpurt?: boolean;

  // D.3 — general, both sexes
  @IsOptional() @IsNumber() @Min(0) familyPubertyOnsetAgeYears?: number;
  @IsOptional() @IsBoolean() behavioralMoodSkinChanges?: boolean;
  @IsOptional() @IsString() otherHealthNotes?: string;
}

export class SubmitPubertyScreeningDto {
  @IsUUID()
  childId: string;

  @ValidateNested()
  @Type(() => PubertyAnswersDto)
  answers: PubertyAnswersDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
