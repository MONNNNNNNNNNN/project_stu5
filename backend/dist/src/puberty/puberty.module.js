"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PubertyModule = void 0;
const common_1 = require("@nestjs/common");
const puberty_controller_1 = require("./puberty.controller");
const puberty_service_1 = require("./puberty.service");
const children_module_1 = require("../children/children.module");
let PubertyModule = class PubertyModule {
};
exports.PubertyModule = PubertyModule;
exports.PubertyModule = PubertyModule = __decorate([
    (0, common_1.Module)({
        imports: [children_module_1.ChildrenModule],
        controllers: [puberty_controller_1.PubertyController],
        providers: [puberty_service_1.PubertyService],
    })
], PubertyModule);
//# sourceMappingURL=puberty.module.js.map