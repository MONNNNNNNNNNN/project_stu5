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
exports.BoneAgeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const children_service_1 = require("../children/children.service");
let BoneAgeService = class BoneAgeService {
    prisma;
    childrenService;
    constructor(prisma, childrenService) {
        this.prisma = prisma;
        this.childrenService = childrenService;
    }
    async upload(userId, childId, imageUrl) {
        await this.childrenService.assertGuardianAccess(childId, userId);
        return this.prisma.boneAgePrediction.create({
            data: { childId, imageUrl },
        });
    }
    predict() {
        throw new common_1.NotImplementedException('AI bone age prediction is not connected yet — the model is being trained separately and will be wired in here.');
    }
    async history(userId, childId) {
        await this.childrenService.assertGuardianAccess(childId, userId);
        return this.prisma.boneAgePrediction.findMany({
            where: { childId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(userId, id) {
        const prediction = await this.prisma.boneAgePrediction.findUnique({ where: { id } });
        if (!prediction) {
            throw new common_1.NotFoundException('Bone age prediction not found');
        }
        await this.childrenService.assertGuardianAccess(prediction.childId, userId);
        return prediction;
    }
    async remove(userId, id) {
        const prediction = await this.findOne(userId, id);
        await this.prisma.boneAgePrediction.delete({ where: { id: prediction.id } });
        return { success: true };
    }
};
exports.BoneAgeService = BoneAgeService;
exports.BoneAgeService = BoneAgeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        children_service_1.ChildrenService])
], BoneAgeService);
//# sourceMappingURL=bone-age.service.js.map