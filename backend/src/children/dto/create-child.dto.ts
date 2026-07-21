import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ChildSex, GuardianRelation } from '@prisma/client';

export class CreateChildDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsEnum(ChildSex)
  sex: ChildSex;

  @IsDateString()
  dateOfBirth: string;

  @IsOptional()
  @IsEnum(GuardianRelation)
  relation?: GuardianRelation;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
