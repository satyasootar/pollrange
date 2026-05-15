import { Poll } from "./poll.model.js";
import { ResponseModel } from "../response/response.model.js";
import { ApiError } from "../../utils/ApiError.js";
import crypto from "crypto";
import type { IPoll } from "./poll.validation.js";
import * as AnalyticsService from "../analytics/analytics.service.js";

/**
 * Creates a new poll for a user and assigns a unique share token.
 */
export async function createPoll(userId: string, pollData: Partial<IPoll>) {
    const shareToken = crypto.randomUUID();
    
    return await Poll.create({
        ...pollData,
        creatorId: userId,
        shareToken,
        status: "active",
    });
}

/**
 * Fetches a specific poll by ID, ensuring it belongs to the requesting user.
 */
export async function getPollByCreator(userId: string, pollId: string) {
    const poll = await Poll.findOne({ _id: pollId, creatorId: userId, isDeleted: false });
    if (!poll) {
        throw new ApiError(404, "Poll not found or unauthorized");
    }
    return poll;
}

/**
 * Lists all non-deleted polls created by a specific user with pagination.
 */
export async function listPollsByCreator(userId: string, filters: { status?: string, search?: string, page?: number, limit?: number }) {
    const { status, search, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;
    
    const query: any = { creatorId: userId, isDeleted: false };
    
    if (status && status !== "all") {
        query.status = status;
    }
    
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ];
    }

    const polls = await Poll.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    
    const total = await Poll.countDocuments(query);
    
    return {
        polls,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
        }
    };
}

/**
 * Updates a poll's details if it has no responses yet.
 */
export async function updatePoll(userId: string, pollId: string, updateData: Partial<IPoll>) {
    const poll = await Poll.findOneAndUpdate(
        { _id: pollId, creatorId: userId, totalResponses: 0 },
        { $set: updateData },
        { new: true }
    );

    if (!poll) {
        throw new ApiError(400, "Poll not found, unauthorized, or already has responses and cannot be edited.");
    }

    return poll;
}

/**
 * Marks a poll as deleted (soft delete).
 */
export async function deletePoll(userId: string, pollId: string) {
    const poll = await Poll.findOneAndUpdate(
        { _id: pollId, creatorId: userId },
        { $set: { isDeleted: true } },
        { new: true }
    );

    if (!poll) {
        throw new ApiError(404, "Poll not found or unauthorized");
    }

    return { success: true };
}

/**
 * Retrieves a poll for public access using its unique share token.
 * 
 * Behavior by status:
 *   - "active": Returns poll structure for voting (vote counts hidden).
 *   - "published": Returns poll with full results (vote counts visible).
 *   - "closed": Returns 410 (poll completed but results not yet published).
 *   - "draft": Returns 404 (not publicly visible).
 */
export async function getPublicPoll(shareToken: string, context: { sessionToken?: string, userId?: string } = {}) {
    const poll = await Poll.findOne({ 
        shareToken, 
        isDeleted: false,
    });

    if (!poll) {
        throw new ApiError(404, "Poll not found");
    }

    // Handle expired active polls
    if (poll.status === "active" && poll.expiresAt < new Date()) {
        poll.status = "closed";
        poll.closedAt = new Date();
        await poll.save();
    }

    // Check if user already responded
    let alreadyResponded = false;
    if (context.sessionToken || context.userId) {
        const query: any = { pollId: poll._id };
        if (context.userId) {
            query.$or = [{ respondentId: context.userId }];
            if (context.sessionToken) query.$or.push({ sessionToken: context.sessionToken });
        } else {
            query.sessionToken = context.sessionToken;
        }
        alreadyResponded = await ResponseModel.exists(query) !== null;
    }

    // Draft polls are not publicly accessible
    if (poll.status === "draft") {
        throw new ApiError(404, "Poll not found");
    }

    // Convert to plain object and remove sensitive fields
    const sanitized = poll.toObject() as any;
    delete sanitized.creatorId;
    sanitized.alreadyResponded = alreadyResponded;
    sanitized.pollId = sanitized._id;

    // Active or Closed polls: return the poll structure for voting (hide vote counts)
    if (sanitized.status === "active" || sanitized.status === "closed") {
        for (const question of sanitized.questions) {
            if (question.options) {
                for (const option of question.options) {
                    delete (option as any).voteCount;
                }
            }
        }
        delete (sanitized as any).totalResponses;
        return sanitized;
    }

    // Published polls: return full results with vote counts
    if (sanitized.status === "published") {
        return sanitized;
    }

    return sanitized;
}

/**
 * Changes a poll's status to published, making results visible to the public.
 * Can only publish polls that are "active" or "closed".
 */
export async function publishPollResults(userId: string, pollId: string) {
    const poll = await Poll.findOne({ _id: pollId, creatorId: userId, isDeleted: false });
    
    if (!poll) {
        throw new ApiError(404, "Poll not found or unauthorized");
    }

    if (poll.status === "published") {
        throw new ApiError(400, "Poll results are already published");
    }

    if (poll.status === "draft") {
        throw new ApiError(400, "Cannot publish a draft poll. Activate it first.");
    }

    poll.status = "published";
    poll.publishedAt = new Date();
    if (!poll.closedAt) {
        poll.closedAt = new Date();
    }
    await poll.save();

    return poll;
}

/**
 * Retrieves public analytics snapshot for a published poll using its share token.
 */
export async function getPublicResults(shareToken: string) {
    const poll = await Poll.findOne({ 
        shareToken, 
        isDeleted: false,
    });

    if (!poll) {
        throw new ApiError(404, "Poll not found");
    }

    if (poll.status !== "published") {
        throw new ApiError(403, "Poll results are not public");
    }

    return await AnalyticsService.getPollAnalyticsSnapshot(poll._id.toString());
}
/**
 * Closes a poll manually before its expiration.
 */
export async function closePoll(userId: string, pollId: string) {
    const poll = await Poll.findOne({ _id: pollId, creatorId: userId, isDeleted: false });
    
    if (!poll) {
        throw new ApiError(404, "Poll not found or unauthorized");
    }

    if (poll.status === "closed") {
        throw new ApiError(400, "Poll is already closed");
    }

    poll.status = "closed";
    poll.closedAt = new Date();
    await poll.save();

    return poll;
}

/**
 * Reopens a closed poll and optionally sets a new expiration date.
 */
export async function reopenPoll(userId: string, pollId: string) {
    const poll = await Poll.findOne({ _id: pollId, creatorId: userId, isDeleted: false });
    
    if (!poll) {
        throw new ApiError(404, "Poll not found or unauthorized");
    }

    if (poll.status !== "closed") {
        throw new ApiError(400, "Only closed polls can be reopened");
    }

    poll.status = "active";
    poll.closedAt = undefined;
    // Default to 7 days from now if it was already expired
    if (poll.expiresAt < new Date()) {
        poll.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    
    await poll.save();

    return poll;
}

/**
 * Regenerates the share token for a poll, effectively changing its public URL.
 */
export async function regenerateShareToken(userId: string, pollId: string) {
    const poll = await Poll.findOne({ _id: pollId, creatorId: userId, isDeleted: false });
    
    if (!poll) {
        throw new ApiError(404, "Poll not found or unauthorized");
    }

    const newShareToken = crypto.randomUUID();
    poll.shareToken = newShareToken;
    await poll.save();

    return { shareToken: newShareToken };
}

/**
 * Checks the status of a poll for public access.
 */
export async function checkPollStatus(shareToken: string, context: { sessionToken?: string, userId?: string } = {}) {
    const poll = await Poll.findOne({ shareToken, isDeleted: false });
    
    if (!poll) {
        throw new ApiError(404, "Poll not found");
    }

    let alreadyResponded = false;
    if (context.sessionToken || context.userId) {
        const query: any = { pollId: poll._id };
        if (context.userId) {
            query.$or = [{ respondentId: context.userId }];
            if (context.sessionToken) query.$or.push({ sessionToken: context.sessionToken });
        } else {
            query.sessionToken = context.sessionToken;
        }
        alreadyResponded = await ResponseModel.exists(query) !== null;
    }

    return {
        pollId: poll._id,
        status: poll.status,
        expiresAt: poll.expiresAt,
        isExpired: poll.expiresAt < new Date(),
        alreadyResponded,
        totalResponses: poll.totalResponses,
        settings: poll.settings
    };
}
