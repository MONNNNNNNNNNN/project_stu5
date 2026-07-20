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
exports.PubertyController = void 0;
const common_1 = require("@nestjs/common");
const puberty_service_1 = require("./puberty.service");
const submit_puberty_screening_dto_1 = require("./dto/submit-puberty-screening.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let PubertyController = class PubertyController {
    pubertyService;
    constructor(pubertyService) {
        this.pubertyService = pubertyService;
    }
    submit(user, dto) {
        return this.pubertyService.submit(user.userId, dto);
    }
    history(user, childId) {
        return this.pubertyService.history(user.userId, childId);
    }
    findOne(user, id) {
        return this.pubertyService.findOne(user.userId, id);
    }
};
exports.PubertyController = PubertyController;
__decorate([
    (0, common_1.Post)('questionnaire'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, submit_puberty_screening_dto_1.SubmitPubertyScreeningDto]),
    __metadata("design:returntype", void 0)
], PubertyController.prototype, "submit", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('childId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PubertyController.prototype, "history", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PubertyController.prototype, "findOne", null);
exports.PubertyController = PubertyController = __decorate([
    (0, common_1.Controller)('puberty'),
    __metadata("design:paramtypes", [puberty_service_1.PubertyService])
], PubertyController);
//# sourceMappingURL=puberty.controller.js.map