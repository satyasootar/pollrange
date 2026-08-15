import { Poll } from "../modules/poll/poll.model.js";
import { emitPollStatusChange } from "../socket/index.js";

/**
 * Background job that checks for expired polls and marks them as 'closed'.
 * Runs periodically to ensure system integrity.
 */
export async function watchPollExpiry() {
    try {
        const now = new Date();

        // Fetch the ids first so we can broadcast a status change for each closed poll.
        const expiredPolls = await Poll.find(
            { status: "active", expiresAt: { $lt: now } },
            { _id: 1 }
        );

        if (expiredPolls.length === 0) return;

        const closedAt = new Date();
        const result = await Poll.updateMany(
            { status: "active", expiresAt: { $lt: now } },
            { $set: { status: "closed", closedAt } }
        );

        for (const poll of expiredPolls) {
            emitPollStatusChange(poll._id.toString(), {
                status: "closed",
                closedAt,
                reason: "expired",
            });
        }

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
