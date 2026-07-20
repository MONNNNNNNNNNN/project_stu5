import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            avatarUrl: string | null;
            isVerified: boolean;
            createdAt: Date;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            avatarUrl: string | null;
            isVerified: boolean;
            createdAt: Date;
        };
    }>;
    logout(dto: RefreshTokenDto): Promise<{
        success: boolean;
    }>;
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            avatarUrl: string | null;
            isVerified: boolean;
            createdAt: Date;
        };
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        success: boolean;
        resetToken?: undefined;
    } | {
        success: boolean;
        resetToken: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        success: boolean;
    }>;
    getProfile(user: AuthUser): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: string;
        avatarUrl: string | null;
        isVerified: boolean;
        createdAt: Date;
    }>;
    updateProfile(user: AuthUser, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: string;
        avatarUrl: string | null;
        isVerified: boolean;
        createdAt: Date;
    }>;
}
