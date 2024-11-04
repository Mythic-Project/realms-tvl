import { DatabaseService } from '../database/database.service';
export declare class TvlService {
    private readonly dbService;
    private readonly logger;
    private connection;
    private tokenPriceCache;
    private readonly cacheTtl;
    private tokenDetailsMap;
    private treasuryAddressesMap;
    constructor(dbService: DatabaseService);
    private sleep;
    private withRetry;
    updateAllTvl(): Promise<number>;
    getLatestAllTvl(): Promise<number>;
    calculateTvlForDao(daoGovernanceProgramId: string): Promise<number>;
    private calculateRealmTvl;
    private addTokenDetail;
    private logTokenDetails;
    private logTreasuryAddresses;
    private getRealms;
    private getTreasuryAddresses;
    private fetchTokenPrice;
    updatingAllTvl(): Promise<void>;
    updatingEachDaoTvl(): Promise<void>;
}
