import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ChildSex } from '@prisma/client';

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
  @IsString()
  avatarUrl?: string;
}
