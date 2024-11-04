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
var TvlService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TvlService = void 0;
const common_1 = require("@nestjs/common");
const web3_js_1 = require("@solana/web3.js");
const database_service_1 = require("../database/database.service");
const axios_1 = require("axios");
const configuration_1 = require("../config/configuration");
const index_1 = require("../constants/index");
const spl_governance_1 = require("@solana/spl-governance");
const schedule_1 = require("@nestjs/schedule");
let TvlService = TvlService_1 = class TvlService {
    constructor(dbService) {
        this.dbService = dbService;
        this.logger = new common_1.Logger(TvlService_1.name);
        this.tokenPriceCache = {};
        this.cacheTtl = 600000;
        this.tokenDetailsMap = new Map();
        this.treasuryAddressesMap = new Map();
        this.connection = new web3_js_1.Connection((0, configuration_1.default)().rpcUrl, 'confirmed');
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async withRetry(fn, retries = 5, delay = 500) {
        try {
            return await fn();
        }
        catch (error) {
            if (retries > 0 && error.response?.status === 429) {
                this.logger.warn(`Retrying after ${delay}ms due to rate limit...`);
                await this.sleep(delay);
                return this.withRetry(fn, retries - 1, delay * 2);
            }
            else {
                throw error;
            }
        }
    }
    async updateAllTvl() {
        try {
            const results = [];
            for (const daoGovernanceProgramId of index_1.GOVERNANCE_PROGRAM_IDS) {
                const tvl = await this.calculateTvlForDao(daoGovernanceProgramId);
                results.push(tvl);
                await this.sleep(2000);
            }
            this.logTokenDetails();
            this.logTreasuryAddresses();
            const totalValue = results.reduce((sum, tvl) => sum + tvl, 0).toFixed(2);
            await this.dbService.query(`INSERT INTO tvl (value, calculated_at) VALUES ($1, NOW())`, [totalValue]);
            this.logger.log('Total TVL for all DAOs updated successfully');
            return parseFloat(totalValue);
        }
        catch (error) {
            this.logger.error('Error updating total TVL for all DAOs', error);
            throw error;
        }
    }
    async getLatestAllTvl() {
        const result = await this.dbService.query(`SELECT value, calculated_at FROM tvl ORDER BY calculated_at DESC LIMIT 1`);
        const result2 = await this.dbService.query(`SELECT value, calculated_at FROM default_tvl ORDER BY calculated_at DESC LIMIT 1`);
        return result.rows.length > 0 && result2.rows.length > 0 ?
            parseFloat(result.rows[0].value) + parseFloat(result2.rows[0].value) :
            result.rows.length > 0 ?
                parseFloat(result.rows[0].value) :
                result2.rows.length > 0 ?
                    parseFloat(result2.rows[0].value) :
                    null;
    }
    async calculateTvlForDao(daoGovernanceProgramId) {
        const result = await this.dbService.query(`SELECT value, calculated_at FROM dao_tvl WHERE dao_id = $1 ORDER BY calculated_at DESC LIMIT 1`, [daoGovernanceProgramId]);
        if (result.rows.length > 0) {
            const latestEntry = result.rows[0];
            this.logger.log(`Returning cached TVL for DAO ${daoGovernanceProgramId}`);
            return parseFloat(latestEntry.value);
        }
        this.logger.log(`Calculating TVL for DAO ${daoGovernanceProgramId}`);
        let totalValue = 0;
        const realms = await this.getRealms(new web3_js_1.PublicKey(daoGovernanceProgramId));
        console.log('realms', realms.length);
        const batchSize = 25;
        for (let i = 0; i < realms.length; i += batchSize) {
            const realmBatch = realms.slice(i, i + batchSize);
            const batchResults = [];
            const treasuryAddressesBatch = [];
            for (const realm of realmBatch) {
                const realmValue = await this.withRetry(() => this.calculateRealmTvl(realm));
                console.log('realmValue', realmValue);
                batchResults.push(realmValue);
                treasuryAddressesBatch.push(...(await this.getTreasuryAddresses(realm)));
                await this.sleep(2000);
            }
            totalValue += batchResults.reduce((sum, value) => sum + value, 0);
            this.treasuryAddressesMap.set(daoGovernanceProgramId, treasuryAddressesBatch);
            this.logTokenDetails();
            this.logTreasuryAddresses();
        }
        await this.dbService.query(`INSERT INTO dao_tvl (dao_id, value, calculated_at) VALUES ($1, $2, NOW())`, [daoGovernanceProgramId, totalValue]);
        return totalValue;
    }
    async calculateRealmTvl(realm) {
        const treasuryAddresses = await this.getTreasuryAddresses(realm);
        let totalValue = 0;
        for (const address of treasuryAddresses) {
            await this.sleep(500);
            const solBalanceLamports = await this.withRetry(() => this.connection.getBalance(new web3_js_1.PublicKey(address)));
            await this.sleep(500);
            const solPrice = await this.withRetry(() => this.fetchTokenPrice(index_1.SOL_MINT));
            const solBalance = solBalanceLamports / 1_000_000_000;
            const solValue = solBalance * solPrice;
            this.addTokenDetail(index_1.SOL_MINT, solBalance, solPrice, solValue);
            totalValue += solValue;
            await this.sleep(500);
            const tokenAccounts = await this.withRetry(() => this.connection.getParsedTokenAccountsByOwner(new web3_js_1.PublicKey(address), {
                programId: index_1.TOKEN_PROGRAM_ID,
            }));
            for (const { account } of tokenAccounts.value) {
                const mintAddress = account.data.parsed.info.mint;
                const balance = account.data.parsed.info.tokenAmount.uiAmount;
                await this.sleep(500);
                const price = await this.withRetry(() => this.fetchTokenPrice(mintAddress));
                const tokenValue = balance * price;
                this.addTokenDetail(mintAddress, balance, price, tokenValue);
                totalValue += tokenValue;
            }
        }
        return totalValue;
    }
    addTokenDetail(mintAddress, balance, price, value) {
        if (!this.tokenDetailsMap.has(mintAddress)) {
            this.tokenDetailsMap.set(mintAddress, { balance, price, value });
        }
        else {
            const existingDetails = this.tokenDetailsMap.get(mintAddress);
            this.tokenDetailsMap.set(mintAddress, {
                balance: (existingDetails?.balance || 0) + balance,
                price: existingDetails?.price || price,
                value: (existingDetails?.value || 0) + value,
            });
        }
    }
    logTokenDetails() {
        this.logger.log('Logging token details for all processed tokens:');
        this.tokenDetailsMap.forEach((details, mintAddress) => {
            this.logger.log(`Token: ${mintAddress}, Total Balance: ${details.balance.toFixed(6)}, Price: ${details.price.toFixed(2)}, Total Value: ${details.value.toFixed(2)}`);
        });
    }
    logTreasuryAddresses() {
        this.logger.log('Logging treasury addresses for all processed DAOs:');
        this.treasuryAddressesMap.forEach((addresses, daoGovernanceProgramId) => {
            this.logger.log(`DAO Governance Program ID: ${daoGovernanceProgramId}, Treasury Addresses: ${addresses.join(', ')}`);
        });
    }
    async getRealms(programId) {
        await this.sleep(500);
        return await (0, spl_governance_1.getRealms)(this.connection, programId);
    }
    async getTreasuryAddresses(realm) {
        await this.sleep(500);
        const governances = await (0, spl_governance_1.getAllGovernances)(this.connection, new web3_js_1.PublicKey(realm.owner.toBase58()), new web3_js_1.PublicKey(realm.pubkey.toBase58()));
        const treasuryAddresses = await Promise.all(governances.map(async (governance) => {
            await this.sleep(500);
            return (0, spl_governance_1.getNativeTreasuryAddress)(new web3_js_1.PublicKey(realm.owner.toBase58()), governance.pubkey);
        }));
        return treasuryAddresses;
    }
    async fetchTokenPrice(mintAddress) {
        const now = Date.now();
        if (this.tokenPriceCache[mintAddress] &&
            now - this.tokenPriceCache[mintAddress].timestamp < this.cacheTtl) {
            this.logger.debug(`Using cached price for ${mintAddress}`);
            return this.tokenPriceCache[mintAddress].price;
        }
        try {
            await this.sleep(500);
            const response = await this.withRetry(() => axios_1.default.get(`https://price.jup.ag/v4/price?ids=${mintAddress}`));
            const data = response.data;
            const price = data?.data[mintAddress]?.price || 0;
            this.tokenPriceCache[mintAddress] = { price, timestamp: now };
            return price;
        }
        catch (error) {
            this.logger.error(`Error fetching price for ${mintAddress}`, error);
            return 0;
        }
    }
    async updatingAllTvl() {
        try {
            this.logger.debug('Running scheduled monthly TVL update');
            await this.updateAllTvl();
        }
        catch (error) {
            this.logger.error('Error updating total TVL for all DAOs', error);
        }
    }
    async updatingEachDaoTvl() {
        try {
            for (const daoGovernanceProgramId of index_1.GOVERNANCE_PROGRAM_IDS) {
                await this.calculateTvlForDao(daoGovernanceProgramId);
                await this.sleep(2000);
            }
        }
        catch (error) {
            this.logger.error('Error updating TVL for all DAOs', error);
        }
    }
};
exports.TvlService = TvlService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TvlService.prototype, "updatingAllTvl", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TvlService.prototype, "updatingEachDaoTvl", null);
exports.TvlService = TvlService = TvlService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], TvlService);
//# sourceMappingURL=tvl.service.js.map