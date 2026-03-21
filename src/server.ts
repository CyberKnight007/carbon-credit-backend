import app from "./app";
import { config } from "./config";
import { prisma } from "./config/database";
import cron from "node-cron";
import { processMonthlyPayouts } from "./services/payment.service";

async function main() {
  await prisma.$connect();
  console.log("✅ Database connected");

  // Run monthly payout on 1st of each month at midnight UTC
  cron.schedule("0 0 1 * *", async () => {
    const now = new Date();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    console.log(`🔄 Running monthly payouts for ${month}/${year}`);
    await processMonthlyPayouts(month, year).catch(console.error);
  });

  app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
    console.log(`📊 Environment: ${config.nodeEnv}`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
