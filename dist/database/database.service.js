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
var DatabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const configuration_1 = require("../config/configuration");
let DatabaseService = DatabaseService_1 = class DatabaseService {
    constructor() {
        this.logger = new common_1.Logger(DatabaseService_1.name);
        this.pool = new pg_1.Pool({
            host: (0, configuration_1.default)().host,
            port: (0, configuration_1.default)().dbPort,
            user: (0, configuration_1.default)().user,
            password: (0, configuration_1.default)().password,
            database: (0, configuration_1.default)().database,
        });
        this.pool.on('error', (err) => {
            this.logger.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }
    async onModuleInit() {
        await this.initializeDatabase();
    }
    async query(text, params) {
        const client = await this.pool.connect();
        try {
            const res = await client.query(text, params);
            return res;
        }
        finally {
            client.release();
        }
    }
    async initializeDatabase() {
        await this.query(`
      CREATE TABLE IF NOT EXISTS tvl (
        id SERIAL PRIMARY KEY,
        value NUMERIC,
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await this.query(`
      CREATE TABLE IF NOT EXISTS dao_tvl (
        id SERIAL PRIMARY KEY,
        dao_id VARCHAR(255) NOT NULL,
        value NUMERIC,
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.logger.log('Database initialized');
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = DatabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DatabaseService);
//# sourceMappingURL=database.service.js.map