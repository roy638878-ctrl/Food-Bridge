import cron from "node-cron";
import { expireStaleListings } from "../modules/listings/listing.service.js";

/**
 * Periodically marks expired surplus food listings so expired food can never be claimed.
 */
export function startExpiryWatcher(db) {
  const task = cron.schedule("*/5 * * * *", () => {
    try {
      const expiredCount = expireStaleListings(db);
      if (expiredCount > 0 && process.env.NODE_ENV !== "test") {
        console.log(`[ExpiryWatcher] Marked ${expiredCount} listing(s) as expired.`);
      }
    } catch (err) {
      console.error("[ExpiryWatcher] Error expiring listings:", err);
    }
  });
  return task;
}
