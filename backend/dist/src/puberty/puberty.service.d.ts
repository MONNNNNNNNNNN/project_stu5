import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import { SubmitPubertyScreeningDto } from './dto/submit-puberty-screening.dto';
export declare class PubertyService {
    private prisma;
    private childrenService;
    constructor(prisma: PrismaService, childrenService: ChildrenService);
    submit(userId: string, dto: SubmitPubertyScreeningDto): Promise<{
        id: string;
        createdAt: Date;
        childId: string;
        tannerStage: import(".prisma/client").$Enums.TannerStage;
        answers: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        assessedAt: Date;
    }>;
    history(userId: string, childId: string): Promise<{
        id: string;
        createdAt: Date;
        childId: string;
        tannerStage: import(".prisma/client").$Enums.TannerStage;
        answers: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        assessedAt: Date;
    }[]>;
    findOne(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        childId: string;
        tannerStage: import(".prisma/client").$Enums.TannerStage;
        answers: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        assessedAt: Date;
    }>;
}
