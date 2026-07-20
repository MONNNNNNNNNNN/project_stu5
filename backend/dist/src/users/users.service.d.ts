import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    private sanitize;
    me(userId: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: string;
        avatarUrl: string | null;
        isVerified: boolean;
        createdAt: Date;
    }>;
    updateMe(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: string;
        avatarUrl: string | null;
        isVerified: boolean;
        createdAt: Date;
    }>;
    deleteMe(userId: string): Promise<{
        success: boolean;
    }>;
}
