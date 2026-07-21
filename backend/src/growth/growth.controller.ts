import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GrowthService } from './growth.service';
import { CreateGrowthRecordDto } from './dto/create-growth-record.dto';
import { UpdateGrowthRecordDto } from './dto/update-growth-record.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('growth')
export class GrowthController {
  constructor(private growthService: GrowthService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGrowthRecordDto) {
    return this.growthService.create(user.userId, dto);
  }

  @Get('chart')
  chart(@CurrentUser() user: AuthUser, @Query('childId') childId: string) {
    return this.growthService.chart(user.userId, childId);
  }

  @Get('reference-curve')
  referenceCurve(
    @CurrentUser() user: AuthUser,
    @Query('childId') childId: string,
    @Query('measure') measure: 'height' | 'weight' | 'bmi',
  ) {
    return this.growthService.referenceCurve(user.userId, childId, measure);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser, @Query('childId') childId: string) {
    return this.growthService.history(user.userId, childId);
  }

  @Get('statistics')
  statistics(@CurrentUser() user: AuthUser, @Query('childId') childId: string) {
    return this.growthService.statistics(user.userId, childId);
  }

  @Get('bmi')
  bmi(@Query('heightCm') heightCm: string, @Query('weightKg') weightKg: string) {
    return this.growthService.bmi(Number(heightCm), Number(weightKg));
  }

  @Get('percentile')
  percentile(
    @Query('sex') sex: 'MALE' | 'FEMALE',
    @Query('ageMonths') ageMonths: string,
    @Query('measure') measure: 'height' | 'weight' | 'bmi',
    @Query('value') value: string,
  ) {
    return this.growthService.percentile(sex, Number(ageMonths), measure, Number(value));
  }

  @Get('sds')
  sds(
    @Query('sex') sex: 'MALE' | 'FEMALE',
    @Query('ageMonths') ageMonths: string,
    @Query('measure') measure: 'height' | 'weight' | 'bmi',
    @Query('value') value: string,
  ) {
    return this.growthService.sds(sex, Number(ageMonths), measure, Number(value));
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('childId') childId: string) {
    return this.growthService.findAll(user.userId, childId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.growthService.findOne(user.userId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateGrowthRecordDto) {
    return this.growthService.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.growthService.remove(user.userId, id);
  }
}
