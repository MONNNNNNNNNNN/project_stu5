import { ChildSex } from '@prisma/client';
export declare class CreateChildDto {
    fullName: string;
    nickname?: string;
    sex: ChildSex;
    dateOfBirth: string;
    avatarUrl?: string;
}
