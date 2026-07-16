import cron from "node-cron";
import Bill from "../models/Bill.js";

/* --------------------------------------------------
   BILL CLEANUP SCHEDULER
   - Deletes bills older than 60 seconds for specific shopId
   - Runs every 30 seconds to check for cleanup
   - Specific shopId: 695f967abb8a17fee63fdd39
-------------------------------------------------- */

const TARGET_SHOP_ID = "695f967abb8a17fee63fdd39"; // Shop ID for bill cleanup
const BILL_RETENTION_MS = 2 * 60 * 1000; // 2 minutes in milliseconds

export function initBillCleanupScheduler() {
  // Run every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    try {
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - BILL_RETENTION_MS);

      const result = await Bill.deleteMany({
        shopId: TARGET_SHOP_ID,
        createdAt: { $lt: cutoffTime },
      });

      if (result.deletedCount > 0) {
        console.log(
          `[Bill Cleanup] Deleted ${result.deletedCount} old bills for shopId ${TARGET_SHOP_ID}`
        );
      }
    } catch (error) {
      console.error("[Bill Cleanup Error]:", error.message);
    }
  });

  console.log("[Bill Cleanup Scheduler] Initialized - Running every 30 seconds");
  console.log(
    `[Bill Cleanup Scheduler] Target ShopId: ${TARGET_SHOP_ID}, Retention: ${BILL_RETENTION_MS}ms`
  );
}
