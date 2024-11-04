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
var TvlController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TvlController = void 0;
const common_1 = require("@nestjs/common");
const tvl_service_1 = require("./tvl.service");
let TvlController = TvlController_1 = class TvlController {
    constructor(tvlService) {
        this.tvlService = tvlService;
        this.logger = new common_1.Logger(TvlController_1.name);
    }
    async getLatestAllTvl() {
        try {
            const totalValueUsd = await this.tvlService.getLatestAllTvl();
            if (totalValueUsd !== null) {
                return { totalValueUsd };
            }
            else {
                return { error: 'TVL data not available' };
            }
        }
        catch (error) {
            this.logger.error('Error fetching latest total TVL', error);
            return { error: 'Error fetching TVL' };
        }
    }
};
exports.TvlController = TvlController;
__decorate([
    (0, common_1.Get)('latest'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TvlController.prototype, "getLatestAllTvl", null);
exports.TvlController = TvlController = TvlController_1 = __decorate([
    (0, common_1.Controller)('tvl'),
    __metadata("design:paramtypes", [tvl_service_1.TvlService])
], TvlController);
//# sourceMappingURL=tvl.controller.js.map