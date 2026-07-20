import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
export declare class ChildrenService {
    private prisma;
    constructor(prisma: PrismaService);
    private assertGuardian;
    assertGuardianAccess(childId: string, userId: string): Promise<void>;
    create(userId: string, dto: CreateChildDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        avatarUrl: string | null;
        deletedAt: Date | null;
        nickname: string | null;
        sex: import(".prisma/client").$Enums.ChildSex;
        dateOfBirth: Date;
    }>;
    findAllForUser(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        avatarUrl: string | null;
        deletedAt: Date | null;
        nickname: string | null;
        sex: import(".prisma/client").$Enums.ChildSex;
        dateOfBirth: Date;
    }[]>;
    findOne(userId: string, childId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        avatarUrl: string | null;
        deletedAt: Date | null;
        nickname: string | null;
        sex: import(".prisma/client").$Enums.ChildSex;
        dateOfBirth: Date;
    }>;
    update(userId: string, childId: string, dto: UpdateChildDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        avatarUrl: string | null;
        deletedAt: Date | null;
        nickname: string | null;
        sex: import(".prisma/client").$Enums.ChildSex;
        dateOfBirth: Date;
    }>;
    remove(userId: string, childId: string): Promise<{
        success: boolean;
    }>;
}
