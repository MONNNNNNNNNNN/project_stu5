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
exports.GrowthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const children_service_1 = require("../children/children.service");
function computeBmi(heightCm, weightKg) {
    if (!heightCm || !weightKg)
        return null;
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}
let GrowthService = class GrowthService {
    prisma;
    childrenService;
    constructor(prisma, childrenService) {
        this.prisma = prisma;
        this.childrenService = childrenService;
    }
    async create(userId, dto) {
        await this.childrenService.assertGuardianAccess(dto.childId, userId);
        const bmi = computeBmi(dto.heightCm, dto.weightKg);
        return this.prisma.growthRecord.create({
            data: {
                childId: dto.childId,
                measuredAt: dto.measuredAt ? new Date(dto.measuredAt) : new Date(),
                heightCm: dto.heightCm,
                weightKg: dto.weightKg,
                bmi: bmi ?? undefined,
                note: dto.note,
            },
        });
    }
    async findAll(userId, childId) {
        await this.childrenService.assertGuardianAccess(childId, userId);
        return this.prisma.growthRecord.findMany({
            where: { childId, deletedAt: null },
            orderBy: { measuredAt: 'desc' },
        });
    }
    async findOne(userId, id) {
        const record = await this.prisma.growthRecord.findUnique({ where: { id } });
        if (!record || record.deletedAt) {
            throw new common_1.NotFoundException('Growth record not found');
        }
        await this.childrenService.assertGuardianAccess(record.childId, userId);
        return record;
    }
    async update(userId, id, dto) {
        const record = await this.findOne(userId, id);
        const heightCm = dto.heightCm ?? Number(record.heightCm) ?? undefined;
        const weightKg = dto.weightKg ?? Number(record.weightKg) ?? undefined;
        const bmi = computeBmi(heightCm, weightKg);
        return this.prisma.growthRecord.update({
            where: { id },
            data: {
                ...dto,
                measuredAt: dto.measuredAt ? new Date(dto.measuredAt) : undefined,
                bmi: bmi ?? undefined,
            },
        });
    }
    async remove(userId, id) {
        const record = await this.findOne(userId, id);
        await this.prisma.growthRecord.update({
            where: { id: record.id },
            data: { deletedAt: new Date() },
        });
        return { success: true };
    }
    async chart(userId, childId) {
        await this.childrenService.assertGuardianAccess(childId, userId);
        const records = await this.prisma.growthRecord.findMany({
            where: { childId, deletedAt: null },
            orderBy: { measuredAt: 'asc' },
            select: { measuredAt: true, heightCm: true, weightKg: true, bmi: true },
        });
        return records.map((r) => ({
            date: r.measuredAt,
            heightCm: r.heightCm ? Number(r.heightCm) : null,
            weightKg: r.weightKg ? Number(r.weightKg) : null,
            bmi: r.bmi ? Number(r.bmi) : null,
        }));
    }
    async history(userId, childId) {
        return this.findAll(userId, childId);
    }
    async statistics(userId, childId) {
        await this.childrenService.assertGuardianAccess(childId, userId);
        const [latest, previous] = await this.prisma.growthRecord.findMany({
            where: { childId, deletedAt: null },
            orderBy: { measuredAt: 'desc' },
            take: 2,
        });
        if (!latest) {
            return { latest: null, heightDeltaCm: null, weightDeltaKg: null, since: null };
        }
        const heightDeltaCm = previous && latest.heightCm && previous.heightCm
            ? Number(latest.heightCm) - Number(previous.heightCm)
            : null;
        const weightDeltaKg = previous && latest.weightKg && previous.weightKg
            ? Number(latest.weightKg) - Number(previous.weightKg)
            : null;
        return {
            latest,
            heightDeltaCm,
            weightDeltaKg,
            since: previous?.measuredAt ?? null,
        };
    }
    bmi(heightCm, weightKg) {
        if (!heightCm || !weightKg) {
            throw new common_1.BadRequestException('heightCm and weightKg query params are required');
        }
        return { bmi: computeBmi(heightCm, weightKg) };
    }
    percentile() {
        throw new common_1.NotImplementedException('Growth percentile calculation requires the WHO/CDC LMS reference dataset — not yet integrated. Follow-up task.');
    }
    sds() {
        throw new common_1.NotImplementedException('Growth SDS (z-score) calculation requires the WHO/CDC LMS reference dataset — not yet integrated. Follow-up task.');
    }
};
exports.GrowthService = GrowthService;
exports.GrowthService = GrowthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        children_service_1.ChildrenService])
], GrowthService);
//# sourceMappingURL=growth.service.js.map