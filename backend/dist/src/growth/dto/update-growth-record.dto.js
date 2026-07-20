"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateGrowthRecordDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_growth_record_dto_1 = require("./create-growth-record.dto");
class UpdateGrowthRecordDto extends (0, mapped_types_1.PartialType)(create_growth_record_dto_1.CreateGrowthRecordDto) {
}
exports.UpdateGrowthRecordDto = UpdateGrowthRecordDto;
//# sourceMappingURL=update-growth-record.dto.js.map