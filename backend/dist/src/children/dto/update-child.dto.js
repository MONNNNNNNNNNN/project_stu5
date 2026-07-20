"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateChildDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_child_dto_1 = require("./create-child.dto");
class UpdateChildDto extends (0, mapped_types_1.PartialType)(create_child_dto_1.CreateChildDto) {
}
exports.UpdateChildDto = UpdateChildDto;
//# sourceMappingURL=update-child.dto.js.map