import { GrowthService } from './growth.service';
import { CreateGrowthRecordDto } from './dto/create-growth-record.dto';
import { UpdateGrowthRecordDto } from './dto/update-growth-record.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
export declare class GrowthController {
    private growthService;
    constructor(growthService: GrowthService);
    create(user: AuthUser, dto: CreateGrowthRecordDto): Promise<{
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
    chart(user: AuthUser, childId: string): Promise<{
        date: Date;
        heightCm: number | null;
        weightKg: number | null;
        bmi: number | null;
    }[]>;
    history(user: AuthUser, childId: string): Promise<{
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
    statistics(user: AuthUser, childId: string): Promise<{
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
    bmi(heightCm: string, weightKg: string): {
        bmi: number | null;
    };
    percentile(): never;
    sds(): never;
    findAll(user: AuthUser, childId: string): Promise<{
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
    findOne(user: AuthUser, id: string): Promise<{
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
    update(user: AuthUser, id: string, dto: UpdateGrowthRecordDto): Promise<{
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
    remove(user: AuthUser, id: string): Promise<{
        success: boolean;
    }>;
}
