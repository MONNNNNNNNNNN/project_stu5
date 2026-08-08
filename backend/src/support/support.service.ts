import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupportMessageDto, userId?: string) {
    await this.prisma.supportMessage.create({
      data: { email: dto.email, subject: dto.subject, message: dto.message, userId },
    });
    return { success: true };
  }
}
