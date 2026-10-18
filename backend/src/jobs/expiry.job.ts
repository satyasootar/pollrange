import { Poll } from "../modules/poll/poll.model.js";
import { emitPollStatusChange } from "../socket/index.js";
import { Form } from "../modules/form/form.model.js";
import { settleExpiredForm, SUBMIT_GRACE_MS } from "../modules/form/form-results.service.js";

/** Last-run info surfaced on the admin system page. */
export const expiryJobStatus: { lastRunAt: string | null; lastError: string | null; totalClosed: number } = {
    lastRunAt: null,
    lastError: null,
    totalClosed: 0,
};

/**
 * Background job that checks for expired polls and marks them as 'closed'.
 * Runs periodically to ensure system integrity.
 */
export async function watchPollExpiry() {
    try {
        const now = new Date();
        expiryJobStatus.lastRunAt = now.toISOString();
        expiryJobStatus.lastError = null;

        // Fetch the ids first so we can broadcast a status change for each closed poll.
        const expiredPolls = await Poll.find(
            { status: "active", expiresAt: { $lt: now } },
            { _id: 1 }
        );

        await settleExpiredForms(now);

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

        expiryJobStatus.totalClosed += result.modifiedCount;
        if (result.modifiedCount > 0) {
            console.log(`[ExpiryJob] Automatically closed ${result.modifiedCount} expired polls.`);
        }
    } catch (error) {
        expiryJobStatus.lastError = error instanceof Error ? error.message : String(error);
        console.error("[ExpiryJob] Error while closing expired polls:", error);
    }
}

/** Closes expired forms; quizzes set to auto-publish release their leaderboard here. */
async function settleExpiredForms(now: Date) {
    const expired = await Form.find(
        { status: "active", isDeleted: false, expiresAt: { $lt: new Date(now.getTime() - SUBMIT_GRACE_MS) } },
        { _id: 1, status: 1, expiresAt: 1, isQuiz: 1, settings: 1 }
    ).lean();
    for (const form of expired) {
        try {
            await settleExpiredForm(form, now);
            expiryJobStatus.totalClosed += 1;
        } catch (error) {
            console.error(`[ExpiryJob] Could not settle form ${form._id}:`, error);
        }
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
