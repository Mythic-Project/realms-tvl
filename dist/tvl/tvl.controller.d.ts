import { TvlService } from './tvl.service';
export declare class TvlController {
    private readonly tvlService;
    private readonly logger;
    constructor(tvlService: TvlService);
    getLatestAllTvl(): Promise<{
        totalValueUsd: number;
        error?: undefined;
    } | {
        error: string;
        totalValueUsd?: undefined;
    }>;
}
