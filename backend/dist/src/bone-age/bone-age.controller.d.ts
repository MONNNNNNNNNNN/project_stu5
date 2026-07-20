import { BoneAgeService } from './bone-age.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
export declare class BoneAgeController {
    private boneAgeService;
    constructor(boneAgeService: BoneAgeService);
    upload(user: AuthUser, childId: string, file: Express.Multer.File): Promise<{
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
    history(user: AuthUser, childId: string): Promise<{
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
    findOne(user: AuthUser, id: string): Promise<{
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
    remove(user: AuthUser, id: string): Promise<{
        success: boolean;
    }>;
}
