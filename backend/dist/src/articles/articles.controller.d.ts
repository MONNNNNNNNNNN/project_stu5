import { ArticlesService } from './articles.service';
export declare class ArticlesController {
    private articlesService;
    constructor(articlesService: ArticlesService);
    findAll(category?: string): Promise<({
        category: {
            id: string;
            name: string;
            slug: string;
        };
    } & {
        id: string;
        slug: string;
        categoryId: string;
        title: string;
        summary: string;
        contentMd: string;
        coverImageUrl: string | null;
        tag: string | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findOne(id: string): Promise<{
        category: {
            id: string;
            name: string;
            slug: string;
        };
    } & {
        id: string;
        slug: string;
        categoryId: string;
        title: string;
        summary: string;
        contentMd: string;
        coverImageUrl: string | null;
        tag: string | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    categories(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        slug: string;
    }[]>;
    search(q: string): Promise<({
        category: {
            id: string;
            name: string;
            slug: string;
        };
    } & {
        id: string;
        slug: string;
        categoryId: string;
        title: string;
        summary: string;
        contentMd: string;
        coverImageUrl: string | null;
        tag: string | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
}
