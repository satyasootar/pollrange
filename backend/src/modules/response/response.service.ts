import { ResponseModel } from "./response.model.js";
import { Poll } from "../poll/poll.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { emitAnalyticsUpdate } from "../../socket/index.js";
import mongoose from "mongoose";

/**
 * Processes a poll response submission.
 * Uses atomic $inc operators for concurrency-safe vote counting
 * and broadcasts real-time analytics via Socket.io.
 */
export async function submitResponse(
    pollId: string, 
    responseData: any, 
    meta: { respondentId?: string, ipHash: string, userAgent: string }
) {
    // Validate the poll exists and is active
    const poll = await Poll.findOne({ _id: pollId, isDeleted: false, status: "active" });
    
    if (!poll) {
        throw new ApiError(404, "Poll not found or not active");
    }

    if (poll.expiresAt < new Date()) {
        poll.status = "closed";
        poll.closedAt = new Date();
        await poll.save();
        throw new ApiError(410, "This poll has expired");
    }

    // Prevent duplicate submissions from the same identity
    const dupFilters: any[] = [];
    if (meta.respondentId) {
        dupFilters.push({ pollId, respondentId: meta.respondentId });
    }
    if (meta.ipHash && responseData.sessionToken) {
        dupFilters.push({ pollId, ipHash: meta.ipHash, sessionToken: responseData.sessionToken });
    }

    if (dupFilters.length > 0) {
        const existing = await ResponseModel.findOne({ $or: dupFilters });
        if (existing) {
            throw new ApiError(403, "You have already submitted a response to this poll");
        }
    }

    // Create the response document
    const response = await ResponseModel.create({
        ...responseData,
        pollId,
        respondentId: meta.respondentId,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
        submittedAt: new Date(),
    });

    // Atomic increment of totalResponses
    await Poll.updateOne({ _id: pollId }, { $inc: { totalResponses: 1 } });

    // Atomic increment of individual option vote counts
    for (const answer of responseData.answers) {
        if (!answer.skipped && answer.selectedOptionId) {
            await Poll.updateOne(
                { 
                    _id: pollId,
                    "questions._id": answer.questionId,
                    "questions.options._id": answer.selectedOptionId 
                },
                { 
                    $inc: { "questions.$[q].options.$[o].voteCount": 1 } 
                },
                {
                    arrayFilters: [
                        { "q._id": new mongoose.Types.ObjectId(answer.questionId) },
                        { "o._id": new mongoose.Types.ObjectId(answer.selectedOptionId) }
                    ]
                }
            );
        }
    }

    // Broadcast updated analytics to all connected clients in real-time
    const updatedPoll = await Poll.findById(pollId).select("questions totalResponses title");
    if (updatedPoll) {
        emitAnalyticsUpdate(pollId, {
            pollId,
            totalResponses: updatedPoll.totalResponses,
            questions: updatedPoll.questions,
        });
    }

    return response;
}
