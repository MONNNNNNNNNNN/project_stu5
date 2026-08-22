import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * A yes/no/not-sure answer.
 *
 * The third state is the point. Before it, an unchecked box was read as a confident "no", so
 * a parent who works away, or whose child lives with grandparents, could raise a
 * "delayed development" flag simply by not knowing. Several of the Annex D signs need close
 * physical observation that a parent may honestly not have.
 *
 * `boolean` is still accepted because screenings are stored as raw JSON and recomputed on
 * every read — every record written before this existed holds `true`/`false`, and those must
 * keep producing exactly the outcome they always did.
 */
export type SignAnswer = 'yes' | 'no' | 'unsure';
const SIGN_ANSWERS = ['yes', 'no', 'unsure'];

/**
 * Shape of `answers`, per TOR Annex D (Indicative Puberty Screening Question Categories).
 * Sex-specific fields are optional here since validity depends on the child's sex; the
 * frontend only renders and submits the branch matching the child's sex.
 */
export class PubertyAnswersDto {
  // D.1 — female
  @IsOptional() @IsIn(SIGN_ANSWERS) breastDevelopment?: SignAnswer | boolean;
  @IsOptional() @IsNumber() @Min(0) breastDevelopmentAgeYears?: number;
  @IsOptional() @IsIn(SIGN_ANSWERS) menstruation?: SignAnswer | boolean;
  @IsOptional() @IsNumber() @Min(0) menstruationAgeYears?: number;

  // D.2 — male
  @IsOptional() @IsIn(SIGN_ANSWERS) testicularOrGenitalEnlargement?: SignAnswer | boolean;
  @IsOptional() @IsNumber() @Min(0) testicularOrGenitalEnlargementAgeYears?: number;
  @IsOptional() @IsIn(SIGN_ANSWERS) voiceDeepening?: SignAnswer | boolean;

  // shared across sexes (pubic/underarm hair item is worded per-sex in Annex D but tracked the same way)
  @IsOptional() @IsIn(SIGN_ANSWERS) pubicOrBodyHairGrowth?: SignAnswer | boolean;
  @IsOptional() @IsNumber() @Min(0) pubicOrBodyHairGrowthAgeYears?: number;
  @IsOptional() @IsIn(SIGN_ANSWERS) growthSpurt?: SignAnswer | boolean;

  /**
   * Indirect indicators — things a parent who is not with the child every day can still
   * answer. None of these is specific enough to drive an outcome on its own, but together
   * they are the difference between "we cannot tell" and "worth looking at properly" when the
   * primary signs come back unsure.
   */
  @IsOptional() @IsIn(SIGN_ANSWERS) rapidClothingOrShoeSizeChange?: SignAnswer | boolean;
  @IsOptional() @IsIn(SIGN_ANSWERS) bodyOdourChange?: SignAnswer | boolean;
  @IsOptional() @IsIn(SIGN_ANSWERS) acne?: SignAnswer | boolean;

  // D.3 — general, both sexes
  @IsOptional() @IsNumber() @Min(0) familyPubertyOnsetAgeYears?: number;
  @IsOptional() @IsIn(SIGN_ANSWERS) behavioralMoodSkinChanges?: SignAnswer | boolean;
  @IsOptional() @IsString() otherHealthNotes?: string;

  /** Who answered, when the guardian was not the observer. Recorded, not acted on. */
  @IsOptional() @IsString() answeredBy?: string;

  /** Legacy records only — see SignAnswer. Never written by the current client. */
  @IsOptional() @IsBoolean() _legacy?: boolean;
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
