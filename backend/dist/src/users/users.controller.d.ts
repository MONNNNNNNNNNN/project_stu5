import { UsersService } from './users.service';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    me(user: AuthUser): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: string;
        avatarUrl: string | null;
        isVerified: boolean;
        createdAt: Date;
    }>;
    updateMe(user: AuthUser, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: string;
        avatarUrl: string | null;
        isVerified: boolean;
        createdAt: Date;
    }>;
    deleteMe(user: AuthUser): Promise<{
        success: boolean;
    }>;
}
