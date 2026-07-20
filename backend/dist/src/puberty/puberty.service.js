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
exports.PubertyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const children_service_1 = require("../children/children.service");
let PubertyService = class PubertyService {
    prisma;
    childrenService;
    constructor(prisma, childrenService) {
        this.prisma = prisma;
        this.childrenService = childrenService;
    }
    async submit(userId, dto) {
        await this.childrenService.assertGuardianAccess(dto.childId, userId);
        return this.prisma.pubertyScreening.create({
            data: {
                childId: dto.childId,
                tannerStage: dto.tannerStage,
                answers: dto.answers,
                notes: dto.notes,
            },
        });
    }
    async history(userId, childId) {
        await this.childrenService.assertGuardianAccess(childId, userId);
        return this.prisma.pubertyScreening.findMany({
            where: { childId },
            orderBy: { assessedAt: 'desc' },
        });
    }
    async findOne(userId, id) {
        const screening = await this.prisma.pubertyScreening.findUnique({ where: { id } });
        if (!screening) {
            throw new common_1.NotFoundException('Puberty screening not found');
        }
        await this.childrenService.assertGuardianAccess(screening.childId, userId);
        return screening;
    }
};
exports.PubertyService = PubertyService;
exports.PubertyService = PubertyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        children_service_1.ChildrenService])
], PubertyService);
//# sourceMappingURL=puberty.service.js.map