import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
export declare class ChildrenController {
    private childrenService;
    constructor(childrenService: ChildrenService);
    create(user: AuthUser, dto: CreateChildDto): Promise<{
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
    findAll(user: AuthUser): Promise<{
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
    findOne(user: AuthUser, id: string): Promise<{
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
    update(user: AuthUser, id: string, dto: UpdateChildDto): Promise<{
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
    remove(user: AuthUser, id: string): Promise<{
        success: boolean;
    }>;
}
