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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrowthController = void 0;
const common_1 = require("@nestjs/common");
const growth_service_1 = require("./growth.service");
const create_growth_record_dto_1 = require("./dto/create-growth-record.dto");
const update_growth_record_dto_1 = require("./dto/update-growth-record.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let GrowthController = class GrowthController {
    growthService;
    constructor(growthService) {
        this.growthService = growthService;
    }
    create(user, dto) {
        return this.growthService.create(user.userId, dto);
    }
    chart(user, childId) {
        return this.growthService.chart(user.userId, childId);
    }
    history(user, childId) {
        return this.growthService.history(user.userId, childId);
    }
    statistics(user, childId) {
        return this.growthService.statistics(user.userId, childId);
    }
    bmi(heightCm, weightKg) {
        return this.growthService.bmi(Number(heightCm), Number(weightKg));
    }
    percentile() {
        return this.growthService.percentile();
    }
    sds() {
        return this.growthService.sds();
    }
    findAll(user, childId) {
        return this.growthService.findAll(user.userId, childId);
    }
    findOne(user, id) {
        return this.growthService.findOne(user.userId, id);
    }
    update(user, id, dto) {
        return this.growthService.update(user.userId, id, dto);
    }
    remove(user, id) {
        return this.growthService.remove(user.userId, id);
    }
};
exports.GrowthController = GrowthController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_growth_record_dto_1.CreateGrowthRecordDto]),
    __metadata("design:returntype", void 0)
], GrowthController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('chart'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('childId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GrowthController.prototype, "chart", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('childId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GrowthController.prototype, "history", null);
__decorate([
    (0, common_1.Get)('statistics'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('childId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GrowthController.prototype, "statistics", null);
__decorate([
    (0, common_1.Get)('bmi'),
    __param(0, (0, common_1.Query)('heightCm')),
    __param(1, (0, common_1.Query)('weightKg')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], GrowthController.prototype, "bmi", null);
__decorate([
    (0, common_1.Get)('percentile'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GrowthController.prototype, "percentile", null);
__decorate([
    (0, common_1.Get)('sds'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GrowthController.prototype, "sds", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('childId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GrowthController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GrowthController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_growth_record_dto_1.UpdateGrowthRecordDto]),
    __metadata("design:returntype", void 0)
], GrowthController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GrowthController.prototype, "remove", null);
exports.GrowthController = GrowthController = __decorate([
    (0, common_1.Controller)('growth'),
    __metadata("design:paramtypes", [growth_service_1.GrowthService])
], GrowthController);
//# sourceMappingURL=growth.controller.js.map