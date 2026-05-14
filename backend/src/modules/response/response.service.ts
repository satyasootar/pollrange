import { ResponseModel } from "./response.model.js";
import { Poll } from "../poll/poll.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { emitAnalyticsUpdate } from "../../socket/index.js";
import mongoose from "mongoose";

/**
 * Processes a poll response submission.
 * Handles duplicate detection, atomic increments for option counts,
 * and real-time analytics broadcasting via Socket.io.
 */
export async function submitResponse(
    pollId: string, 
    responseData: any, 
    meta: { respondentId?: string, ipHash: string, userAgent: string }
) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const poll = await Poll.findOne({ _id: pollId, isDeleted: false, status: "active" }).session(session);
        
        if (!poll) {
            throw new ApiError(404, "Poll not found or not active");
        }

        if (poll.expiresAt < new Date()) {
            poll.status = "closed";
            await poll.save({ session });
            throw new ApiError(410, "This poll has expired");
        }

        // Prevent duplicate submissions from the same identity or session
        const existing = await ResponseModel.findOne({
            pollId,
            $or: [
                meta.respondentId ? { respondentId: meta.respondentId } : null,
                { ipHash: meta.ipHash, sessionToken: responseData.sessionToken }
            ].filter(Boolean) as any
        }).session(session);

        if (existing) {
            throw new ApiError(403, "You have already submitted a response to this poll");
        }

        const response = await ResponseModel.create([{
            ...responseData,
            pollId,
            respondentId: meta.respondentId,
            ipHash: meta.ipHash,
            userAgent: meta.userAgent,
            submittedAt: new Date(),
        }], { session });

        // Use bulkWrite for atomic increments to handle high-concurrency writes
        const bulkOps: any[] = [
            {
                updateOne: {
                    filter: { _id: pollId },
                    update: { $inc: { totalResponses: 1 } }
                }
            }
        ];

        for (const answer of responseData.answers) {
            if (!answer.skipped && answer.selectedOptionId) {
                bulkOps.push({
                    updateOne: {
                        filter: { 
                            _id: pollId,
                            "questions._id": answer.questionId,
                            "questions.options._id": answer.selectedOptionId
                        },
                        update: { 
                            $inc: { "questions.$[q].options.$[o].voteCount": 1 } 
                        },
                        arrayFilters: [
                            { "q._id": answer.questionId },
                            { "o._id": answer.selectedOptionId }
                        ]
                    }
                });
            }
        }

        await Poll.bulkWrite(bulkOps, { session });
        await session.commitTransaction();

        // Broadcast updated analytics to all connected clients in real-time
        const updatedPoll = await Poll.findById(pollId).select("questions totalResponses title");
        if (updatedPoll) {
            emitAnalyticsUpdate(pollId, {
                pollId,
                totalResponses: updatedPoll.totalResponses,
                questions: updatedPoll.questions,
            });
        }

        return response[0];
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
