"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChildrenService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ChildrenService = class ChildrenService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertGuardian(childId, userId) {
        return this.assertGuardianAccess(childId, userId);
    }
    async assertGuardianAccess(childId, userId) {
        const link = await this.prisma.childGuardian.findUnique({
            where: { childId_userId: { childId, userId } },
        });
        if (!link) {
            throw new common_1.ForbiddenException('Not a guardian of this child');
        }
    }
    async create(userId, dto) {
        return this.prisma.child.create({
            data: {
                ...dto,
                dateOfBirth: new Date(dto.dateOfBirth),
                guardians: {
                    create: { userId, isPrimary: true },
                },
            },
        });
    }
    async findAllForUser(userId) {
        return this.prisma.child.findMany({
            where: { deletedAt: null, guardians: { some: { userId } } },
            orderBy: { createdAt: 'asc' },
        });
    }
    async findOne(userId, childId) {
        await this.assertGuardian(childId, userId);
        const child = await this.prisma.child.findUnique({ where: { id: childId } });
        if (!child || child.deletedAt) {
            throw new common_1.NotFoundException('Child not found');
        }
        return child;
    }
    async update(userId, childId, dto) {
        await this.assertGuardian(childId, userId);
        const { dateOfBirth, ...rest } = dto;
        return this.prisma.child.update({
            where: { id: childId },
            data: { ...rest, ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}) },
        });
    }
    async remove(userId, childId) {
        await this.assertGuardian(childId, userId);
        await this.prisma.child.update({ where: { id: childId }, data: { deletedAt: new Date() } });
        return { success: true };
    }
};
exports.ChildrenService = ChildrenService;
exports.ChildrenService = ChildrenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChildrenService);
//# sourceMappingURL=children.service.js.map