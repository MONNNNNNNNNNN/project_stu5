import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BoneAgeService } from './bone-age.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/dicom'];

@Controller('bone-age')
export class BoneAgeController {
  constructor(private boneAgeService: BoneAgeService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/bone-age',
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_MIME_TYPES.includes(file.mimetype));
      },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @Body('childId') childId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('X-ray image file is required (JPEG, PNG, or DICOM, max 10MB)');
    }
    return this.boneAgeService.upload(user.userId, childId, `/uploads/bone-age/${file.filename}`);
  }

  @Post('predict')
  predict() {
    return this.boneAgeService.predict();
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser, @Query('childId') childId: string) {
    return this.boneAgeService.history(user.userId, childId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.boneAgeService.findOne(user.userId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.boneAgeService.remove(user.userId, id);
  }
}
