import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
export declare class BoneAgeService {
    private prisma;
    private childrenService;
    constructor(prisma: PrismaService, childrenService: ChildrenService);
    upload(userId: string, childId: string, imageUrl: string): Promise<{
        id: string;
        createdAt: Date;
        childId: string;
        imageUrl: string;
        status: import(".prisma/client").$Enums.BoneAgePredictionStatus;
        predictedAgeMonths: number | null;
        confidenceScore: import("@prisma/client/runtime/library").Decimal | null;
        modelVersion: string | null;
        completedAt: Date | null;
    }>;
    predict(): never;
    history(userId: string, childId: string): Promise<{
        id: string;
        createdAt: Date;
        childId: string;
        imageUrl: string;
        status: import(".prisma/client").$Enums.BoneAgePredictionStatus;
        predictedAgeMonths: number | null;
        confidenceScore: import("@prisma/client/runtime/library").Decimal | null;
        modelVersion: string | null;
        completedAt: Date | null;
    }[]>;
    findOne(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        childId: string;
        imageUrl: string;
        status: import(".prisma/client").$Enums.BoneAgePredictionStatus;
        predictedAgeMonths: number | null;
        confidenceScore: import("@prisma/client/runtime/library").Decimal | null;
        modelVersion: string | null;
        completedAt: Date | null;
    }>;
    remove(userId: string, id: string): Promise<{
        success: boolean;
    }>;
}
