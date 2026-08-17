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

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// JPEG/PNG only. DICOM was accepted here but nothing in the app can render it — the history
// thumbnail is a plain <img>, so a DICOM upload stored a row that displayed as a broken
// image. Narrowing this to what the UI can actually show keeps the promise the upload screen
// makes. If the AI team needs DICOM later, add it here *and* to the viewer.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

@Controller('bone-age')
export class BoneAgeController {
  constructor(private boneAgeService: BoneAgeService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/bone-age',
        filename: (_req, file, cb) => {
          cb(
            null,
            `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`,
          );
        },
      }),
      limits: { fileSize: MAX_UPLOAD_BYTES },
      // FR-16 wants clear feedback on *why* an upload was refused. Passing `false` here
      // dropped the file silently, and the handler then reported the generic "attach an
      // image", which reads as though nothing had been attached at all.
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
        cb(
          new BadRequestException(
            `Unsupported file type "${file.mimetype}". Upload a JPEG or PNG image.`,
          ),
          false,
        );
      },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @Body('childId') childId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Attach an X-ray image to upload (JPEG or PNG, max 10MB).',
      );
    }
    return this.boneAgeService.upload(
      user.userId,
      childId,
      `/uploads/bone-age/${file.filename}`,
    );
  }

  @Post('predict')
  predict() {
    return this.boneAgeService.predict();
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser, @Query('childId') childId: string) {
    return this.boneAgeService.history(user.userId, childId);
  }

  @Get(':id/image')
  image(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.boneAgeService.image(user.userId, id);
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
