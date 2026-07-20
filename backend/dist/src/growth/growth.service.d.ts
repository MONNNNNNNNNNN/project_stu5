import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import { CreateGrowthRecordDto } from './dto/create-growth-record.dto';
import { UpdateGrowthRecordDto } from './dto/update-growth-record.dto';
export declare class GrowthService {
    private prisma;
    private childrenService;
    constructor(prisma: PrismaService, childrenService: ChildrenService);
    create(userId: string, dto: CreateGrowthRecordDto): Promise<{
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        childId: string;
        measuredAt: Date;
        heightCm: import("@prisma/client/runtime/library").Decimal | null;
        weightKg: import("@prisma/client/runtime/library").Decimal | null;
        note: string | null;
        bmi: import("@prisma/client/runtime/library").Decimal | null;
        heightPercentile: import("@prisma/client/runtime/library").Decimal | null;
        weightPercentile: import("@prisma/client/runtime/library").Decimal | null;
        bmiPercentile: import("@prisma/client/runtime/library").Decimal | null;
        heightSds: import("@prisma/client/runtime/library").Decimal | null;
        weightSds: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    findAll(userId: string, childId: string): Promise<{
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        childId: string;
        measuredAt: Date;
        heightCm: import("@prisma/client/runtime/library").Decimal | null;
        weightKg: import("@prisma/client/runtime/library").Decimal | null;
        note: string | null;
        bmi: import("@prisma/client/runtime/library").Decimal | null;
        heightPercentile: import("@prisma/client/runtime/library").Decimal | null;
        weightPercentile: import("@prisma/client/runtime/library").Decimal | null;
        bmiPercentile: import("@prisma/client/runtime/library").Decimal | null;
        heightSds: import("@prisma/client/runtime/library").Decimal | null;
        weightSds: import("@prisma/client/runtime/library").Decimal | null;
    }[]>;
    findOne(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        childId: string;
        measuredAt: Date;
        heightCm: import("@prisma/client/runtime/library").Decimal | null;
        weightKg: import("@prisma/client/runtime/library").Decimal | null;
        note: string | null;
        bmi: import("@prisma/client/runtime/library").Decimal | null;
        heightPercentile: import("@prisma/client/runtime/library").Decimal | null;
        weightPercentile: import("@prisma/client/runtime/library").Decimal | null;
        bmiPercentile: import("@prisma/client/runtime/library").Decimal | null;
        heightSds: import("@prisma/client/runtime/library").Decimal | null;
        weightSds: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    update(userId: string, id: string, dto: UpdateGrowthRecordDto): Promise<{
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        childId: string;
        measuredAt: Date;
        heightCm: import("@prisma/client/runtime/library").Decimal | null;
        weightKg: import("@prisma/client/runtime/library").Decimal | null;
        note: string | null;
        bmi: import("@prisma/client/runtime/library").Decimal | null;
        heightPercentile: import("@prisma/client/runtime/library").Decimal | null;
        weightPercentile: import("@prisma/client/runtime/library").Decimal | null;
        bmiPercentile: import("@prisma/client/runtime/library").Decimal | null;
        heightSds: import("@prisma/client/runtime/library").Decimal | null;
        weightSds: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    remove(userId: string, id: string): Promise<{
        success: boolean;
    }>;
    chart(userId: string, childId: string): Promise<{
        date: Date;
        heightCm: number | null;
        weightKg: number | null;
        bmi: number | null;
    }[]>;
    history(userId: string, childId: string): Promise<{
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        childId: string;
        measuredAt: Date;
        heightCm: import("@prisma/client/runtime/library").Decimal | null;
        weightKg: import("@prisma/client/runtime/library").Decimal | null;
        note: string | null;
        bmi: import("@prisma/client/runtime/library").Decimal | null;
        heightPercentile: import("@prisma/client/runtime/library").Decimal | null;
        weightPercentile: import("@prisma/client/runtime/library").Decimal | null;
        bmiPercentile: import("@prisma/client/runtime/library").Decimal | null;
        heightSds: import("@prisma/client/runtime/library").Decimal | null;
        weightSds: import("@prisma/client/runtime/library").Decimal | null;
    }[]>;
    statistics(userId: string, childId: string): Promise<{
        latest: null;
        heightDeltaCm: null;
        weightDeltaKg: null;
        since: null;
    } | {
        latest: {
            id: string;
            createdAt: Date;
            deletedAt: Date | null;
            childId: string;
            measuredAt: Date;
            heightCm: import("@prisma/client/runtime/library").Decimal | null;
            weightKg: import("@prisma/client/runtime/library").Decimal | null;
            note: string | null;
            bmi: import("@prisma/client/runtime/library").Decimal | null;
            heightPercentile: import("@prisma/client/runtime/library").Decimal | null;
            weightPercentile: import("@prisma/client/runtime/library").Decimal | null;
            bmiPercentile: import("@prisma/client/runtime/library").Decimal | null;
            heightSds: import("@prisma/client/runtime/library").Decimal | null;
            weightSds: import("@prisma/client/runtime/library").Decimal | null;
        };
        heightDeltaCm: number | null;
        weightDeltaKg: number | null;
        since: Date;
    }>;
    bmi(heightCm: number, weightKg: number): {
        bmi: number | null;
    };
    percentile(): never;
    sds(): never;
}
