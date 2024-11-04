export declare class DatabaseService {
    private readonly logger;
    private pool;
    constructor();
    onModuleInit(): Promise<void>;
    query(text: string, params?: any[]): Promise<any>;
    initializeDatabase(): Promise<void>;
}
