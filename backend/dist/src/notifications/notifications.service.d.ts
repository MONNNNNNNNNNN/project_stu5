import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        title: string;
        createdAt: Date;
        userId: string;
        type: import(".prisma/client").$Enums.NotificationType;
        body: string;
        isRead: boolean;
    }[]>;
    private assertOwner;
    markRead(userId: string, id: string): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        userId: string;
        type: import(".prisma/client").$Enums.NotificationType;
        body: string;
        isRead: boolean;
    }>;
    remove(userId: string, id: string): Promise<{
        success: boolean;
    }>;
}
