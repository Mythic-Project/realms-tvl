"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TvlModule = void 0;
const common_1 = require("@nestjs/common");
const tvl_service_1 = require("./tvl.service");
const tvl_controller_1 = require("./tvl.controller");
const database_service_1 = require("../database/database.service");
let TvlModule = class TvlModule {
};
exports.TvlModule = TvlModule;
exports.TvlModule = TvlModule = __decorate([
    (0, common_1.Module)({
        providers: [tvl_service_1.TvlService, database_service_1.DatabaseService],
        controllers: [tvl_controller_1.TvlController],
    })
], TvlModule);
//# sourceMappingURL=tvl.module.js.map