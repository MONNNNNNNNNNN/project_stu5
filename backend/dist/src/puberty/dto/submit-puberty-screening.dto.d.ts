import { TannerStage } from '@prisma/client';
export declare class SubmitPubertyScreeningDto {
    childId: string;
    tannerStage: TannerStage;
    answers: Record<string, unknown>;
    notes?: string;
}
