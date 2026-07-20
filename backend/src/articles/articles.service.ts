import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  async findAll(categorySlug?: string) {
    return this.prisma.article.findMany({
      where: {
        publishedAt: { not: null },
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
      include: { category: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!article || !article.publishedAt) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  categories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async search(query: string) {
    if (!query?.trim()) return [];
    return this.prisma.article.findMany({
      where: {
        publishedAt: { not: null },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { category: true },
      take: 20,
    });
  }
}
