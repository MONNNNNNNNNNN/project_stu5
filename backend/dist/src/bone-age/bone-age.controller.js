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
exports.BoneAgeController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const bone_age_service_1 = require("./bone-age.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/dicom'];
let BoneAgeController = class BoneAgeController {
    boneAgeService;
    constructor(boneAgeService) {
        this.boneAgeService = boneAgeService;
    }
    upload(user, childId, file) {
        if (!file) {
            throw new common_1.BadRequestException('X-ray image file is required (JPEG, PNG, or DICOM, max 10MB)');
        }
        return this.boneAgeService.upload(user.userId, childId, `/uploads/bone-age/${file.filename}`);
    }
    predict() {
        return this.boneAgeService.predict();
    }
    history(user, childId) {
        return this.boneAgeService.history(user.userId, childId);
    }
    findOne(user, id) {
        return this.boneAgeService.findOne(user.userId, id);
    }
    remove(user, id) {
        return this.boneAgeService.remove(user.userId, id);
    }
};
exports.BoneAgeController = BoneAgeController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads/bone-age',
            filename: (_req, file, cb) => {
                cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            cb(null, ALLOWED_MIME_TYPES.includes(file.mimetype));
        },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('childId')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], BoneAgeController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)('predict'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BoneAgeController.prototype, "predict", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('childId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BoneAgeController.prototype, "history", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BoneAgeController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BoneAgeController.prototype, "remove", null);
exports.BoneAgeController = BoneAgeController = __decorate([
    (0, common_1.Controller)('bone-age'),
    __metadata("design:paramtypes", [bone_age_service_1.BoneAgeService])
], BoneAgeController);
//# sourceMappingURL=bone-age.controller.js.map