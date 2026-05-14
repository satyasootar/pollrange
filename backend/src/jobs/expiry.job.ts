import { Poll } from "../modules/poll/poll.model.js";

/**
 * Background job that checks for expired polls and marks them as 'closed'.
 * Runs periodically to ensure system integrity.
 */
export async function watchPollExpiry() {
    try {
        const result = await Poll.updateMany(
            {
                status: "active",
                expiresAt: { $lt: new Date() }
            },
            {
                $set: { 
                    status: "closed",
                    closedAt: new Date()
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`[ExpiryJob] Automatically closed ${result.modifiedCount} expired polls.`);
        }
    } catch (error) {
        console.error("[ExpiryJob] Error while closing expired polls:", error);
    }
}

/**
 * Starts the expiry watcher interval.
 * Default interval is 1 minute.
 */
export function startExpiryWatcher(intervalMs: number = 60000) {
    console.log("[ExpiryJob] Starting poll expiry watcher...");
    
    // Initial check on startup
    watchPollExpiry();
    
    // Schedule periodic checks
    setInterval(watchPollExpiry, intervalMs);
}
