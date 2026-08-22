import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateGrowthRecordDto {
  @IsUUID()
  childId: string;

  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  weightKg?: number;

  /**
   * Infants only. Fills the window below two years where BMI-for-age does not apply — the AAP
   * periodicity schedule measures it at every well-child visit from birth to 24 months.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(80)
  headCircumferenceCm?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
