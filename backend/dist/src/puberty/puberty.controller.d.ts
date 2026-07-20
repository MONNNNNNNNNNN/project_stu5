import { PubertyService } from './puberty.service';
import { SubmitPubertyScreeningDto } from './dto/submit-puberty-screening.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
export declare class PubertyController {
    private pubertyService;
    constructor(pubertyService: PubertyService);
    submit(user: AuthUser, dto: SubmitPubertyScreeningDto): Promise<{
        id: string;
        createdAt: Date;
        childId: string;
        tannerStage: import(".prisma/client").$Enums.TannerStage;
        answers: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        assessedAt: Date;
    }>;
    history(user: AuthUser, childId: string): Promise<{
        id: string;
        createdAt: Date;
        childId: string;
        tannerStage: import(".prisma/client").$Enums.TannerStage;
        answers: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        assessedAt: Date;
    }[]>;
    findOne(user: AuthUser, id: string): Promise<{
        id: string;
        createdAt: Date;
        childId: string;
        tannerStage: import(".prisma/client").$Enums.TannerStage;
        answers: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        assessedAt: Date;
    }>;
}
