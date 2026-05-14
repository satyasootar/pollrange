import { Poll } from "./poll.model.js";
import { ApiError } from "../../utils/ApiError.js";
import crypto from "crypto";
import type { IPoll } from "./poll.validation.js";

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
export async function listPollsByCreator(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const polls = await Poll.find({ creatorId: userId, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    
    const total = await Poll.countDocuments({ creatorId: userId, isDeleted: false });
    
    return {
        polls,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
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
 * Retrieves a poll for public voting using its unique share token.
 * Also handles automatic expiry status updates.
 */
export async function getPublicPoll(shareToken: string) {
    const poll = await Poll.findOne({ 
        shareToken, 
        isDeleted: false,
        status: { $in: ["active", "published"] }
    }).select("-creatorId");

    if (!poll) {
        throw new ApiError(404, "Poll not found or inactive");
    }

    if (poll.expiresAt < new Date() && poll.status === "active") {
        poll.status = "closed";
        await poll.save();
        throw new ApiError(410, "This poll has expired");
    }

    return poll;
}

/**
 * Changes a poll's status to published, making results visible to the public.
 */
export async function publishPollResults(userId: string, pollId: string) {
    const poll = await Poll.findOneAndUpdate(
        { _id: pollId, creatorId: userId },
        { $set: { status: "published", publishedAt: new Date() } },
        { new: true }
    );

    if (!poll) {
        throw new ApiError(404, "Poll not found or unauthorized");
    }

    return poll;
}
