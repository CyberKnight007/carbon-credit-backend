"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const database_1 = require("./config/database");
const node_cron_1 = __importDefault(require("node-cron"));
const payment_service_1 = require("./services/payment.service");
async function main() {
    await database_1.prisma.$connect();
    console.log("✅ Database connected");
    // Run monthly payout on 1st of each month at midnight UTC
    node_cron_1.default.schedule("0 0 1 * *", async () => {
        const now = new Date();
        const month = now.getMonth() === 0 ? 12 : now.getMonth();
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        console.log(`🔄 Running monthly payouts for ${month}/${year}`);
        await (0, payment_service_1.processMonthlyPayouts)(month, year).catch(console.error);
    });
    app_1.default.listen(config_1.config.port, () => {
        console.log(`🚀 Server running on http://localhost:${config_1.config.port}`);
        console.log(`📊 Environment: ${config_1.config.nodeEnv}`);
    });
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map