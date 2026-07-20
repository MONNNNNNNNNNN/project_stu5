import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { TannerStage } from '@prisma/client';

export class SubmitPubertyScreeningDto {
  @IsUUID()
  childId: string;

  @IsEnum(TannerStage)
  tannerStage: TannerStage;

  @IsObject()
  answers: Record<string, unknown>;

  @IsOptional()
  @IsString()
  notes?: string;
}
